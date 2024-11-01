import common from "@ethereumjs/common";
import { TransactionFactory } from "@ethereumjs/tx";
import { Mutex } from "async-mutex";
import * as fs from "fs/promises";
import { EthereumProvider } from "ganache";
import { EventEmitter, PassThrough, Readable } from "stream";
import Web3 from "web3";
import { Log, provider, TransactionReceipt } from "web3-core";
import { Contract, EventData } from "web3-eth-contract";
import { AbiItem, sha3 } from "web3-utils";
import log from "~/log";

import {
  SubscriptionsClient,
  WsSubscriptionsClient,
  NodeEvent,
} from "@calimero-is-near/calimero-p2p-sdk";

interface Abi extends AbiItem {
  signature?: string;
}

export interface ContractOption {
  contractAddress?: string;
  abiFile: string;
  nodeAddress: string;
  privateKey: string;
  provider: string | EthereumProvider;
  gasPrice: number;
  gasLimit: number;
  chainParam: {
    name?: string;
    chainId?: number;
  };
  deployArgs?: any[];
}

interface gasOption {
  gasPrice?: number;
  gasLimit?: number;
}

type Result = { [key: string]: string };
type Mixed = { [key: string | number]: string | any } | string;

const accountMutexs = new Map<string, Mutex>();

// TODO config this url
const subscriptionsClient: SubscriptionsClient = new WsSubscriptionsClient("http://localhost:3000", "ws");

function getAccountMutex(address: string): Mutex {
  let res = accountMutexs.get(address);
  if (!res) {
    res = new Mutex();
    accountMutexs.set(address, res);
  }
  return res;
}



export class ContractHelper {
  private web3!: Web3;
  private abis!: Abi[];
  private contract!: Contract;

  option: ContractOption;

  private unsubscribeMap: Map<Readable, () => void> = new Map();

  private mutex: Mutex;

  constructor(option: ContractOption) {
    this.option = option;
    if (typeof option.provider === "string" && option.contractAddress === undefined) {
      throw new Error("When provider is a url, contractAddress can't be undefined");
    }
    this.mutex = getAccountMutex(this.option.nodeAddress);
  }

  async init(): Promise<void> {
    const content = await fs.readFile(this.option.abiFile, { encoding: "utf-8" });
    const jsonInterface = JSON.parse(content);
    const rawAbis: AbiItem[] = jsonInterface.abi;
    this.abis = rawAbis.map((abi) => {
      if (abi.type === "event") {
        const signature = abi.name + "(" + abi.inputs!.map((input) => input.type).join(",") + ")";
        const hash = sha3(signature);
        return { ...abi, signature: hash || undefined };
      } else {
        return abi;
      }
    });
    if (typeof this.option.provider === "string") {
      const provider = await this.connect(this.option.provider);
      this.web3 = new Web3(provider);
      this.contract = new this.web3.eth.Contract(this.abis, this.option.contractAddress);
    } else {
      // @ts-ignore
      this.web3 = new Web3(this.option.provider);
      this.contract = new this.web3.eth.Contract(this.abis);
      this.option.contractAddress = await this.deployContract(jsonInterface.bytecode);
      this.contract.options.address = this.option.contractAddress;
    }
  }

  async connect(url: string): Promise<provider> {
    if ((url.startsWith("ws://")) || url.startsWith("wss://")) {
      const provider = new Web3.providers.WebsocketProvider(url, {
        reconnect: {
          auto: true,
          delay: 2500,
          onTimeout: true,
          maxAttempts: 3,
        },
        clientConfig: {
          keepalive: true,
          keepaliveInterval: 60000, // ms
        },
        timeout: 30000,
      });
      await subscriptionsClient.connect();
      return new Promise((resolve, reject) => {
        provider.on("connect", () => {
          resolve(provider);
        });
        provider.on("error", () => {
          reject();
        });
      });
    }
    return new Web3.providers.HttpProvider(url);
  }

  async deployContract(bytecode: string): Promise<string> {
    const abiData = this.contract
      .deploy({
        data: bytecode,
        arguments: this.option.deployArgs,
      })
      .encodeABI();
    return await this.mutex.runExclusive(async () => {
      const nonce = await this.web3.eth.getTransactionCount(this.option.nodeAddress, "pending");
      const tra = {
        data: abiData,
        from: this.option.nodeAddress,
        gasPrice: "0x" + this.option.gasPrice.toString(16),
        gasLimit: "0x" + this.option.gasLimit.toString(16),
        nonce: this.web3.utils.toHex(nonce),
      };
      const key = Buffer.from(this.option.privateKey, "hex");
      const tx = TransactionFactory.fromTxData(tra, {
        common: common.custom({ chainId: 1337 }),
      });
      const serializedTx = "0x" + tx.sign(key).serialize().toString("hex");
      const receipt = await this.web3.eth.sendSignedTransaction(serializedTx);
      const finalReceipt = await this.web3.eth.getTransactionReceipt(receipt.transactionHash);
      if (finalReceipt.status == true && finalReceipt.contractAddress) {
        return finalReceipt.contractAddress;
      } else {
        throw new Error("deploy contract failed");
      }
    });
  }

  async method(
    name: string,
    args: any[] = [],
    nonce: number = 0,
    gasOpt: gasOption | null = null
  ): Promise<string> {
    const method = this.contract.methods[name](...args);
    const data = method.encodeABI();

    // get gas price and gas limit

    const gasPrice = Math.ceil(parseInt(await this.web3.eth.getGasPrice()) * 1.5);
    console.log("gasPrice", gasPrice);
    const gasLimit = Math.ceil(await this.web3.eth.estimateGas({ from: this.option.nodeAddress }) * 10);
    console.log("gasLimit", gasLimit);

    return await this.mutex.runExclusive(async () => {
      if (nonce === 0) {
        nonce = await this.web3.eth.getTransactionCount(this.option.nodeAddress, "pending");
      }

      const tra = {
        data: data,
        from: this.option.nodeAddress,
        to: this.option.contractAddress,
        gasPrice: "0x" + gasPrice.toString(16),
        gasLimit: "0x" + gasLimit.toString(16),
        nonce: this.web3.utils.toHex(nonce),
      };

      let privateKey = this.option.privateKey;
      if (privateKey.startsWith("0x")) {
        privateKey = privateKey.slice(2);
      }
      const key = Buffer.from(privateKey, "hex");
      const tx = TransactionFactory.fromTxData(tra, {
        common: common.custom(this.option.chainParam),
      });
      const serializedTx = "0x" + tx.sign(key).serialize().toString("hex");
      const receipt = await this.web3.eth.sendSignedTransaction(serializedTx);
      return receipt.transactionHash;
    });
  }

  async waitForReceipt(hash: string, retry: number = 3): Promise<TransactionReceipt> {
    if (retry === 0) {
      throw new Error(`unable to get transaction receipt for tx ${hash}`);
    }
    try {
      const receipt = await this.web3.eth.getTransactionReceipt(hash);
      if (receipt) {
        if (receipt.status == true) {
          return receipt;
        } else {
          throw new Error(`tx ${receipt.transactionHash} is reverted`);
        }
      } else {
        return await this.waitForReceipt(hash);
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("CONNECTION ERROR") &&
        err.message.includes("reconnect")
      ) {
        return await this.waitForReceipt(hash, retry - 1);
      } else {
        throw err;
      }
    }
  }

  decodeLogs(logs: Log[]): Result | undefined {
    for (const rlog of logs) {
      const topics = rlog.topics;
      const data = rlog.data;
      for (const abi of this.abis) {
        if (abi.signature && topics.includes(abi.signature) && abi.inputs) {
          const result = this.web3.eth.abi.decodeLog(abi.inputs, data, topics.slice(1));
          result.name = abi.name ? abi.name : result.name;
          return result;
        }
      }
    }
    return undefined;
  }

  async call(name: string, args: any[] = []): Promise<Mixed> {
    const method = this.contract.methods[name](...args);
    const res = await method.call({ from: this.option.nodeAddress });
    return res;
  }

  subscribe(): Readable {
    // TODO config app id
    subscriptionsClient.subscribe(["app-id"]);
    const stream = new PassThrough({ objectMode: true });
    const callback = (event: EventData) => {
      stream.write(event);
    };

    const emitter: EventEmitter = this.contract.events.allEvents({ fromBlock: "latest" });
    emitter.on("data", callback);

    const unsubscribe = () => {
      emitter.off("data", callback);
    };
    this.unsubscribeMap.set(stream, unsubscribe);

    return stream;
  }

  unsubscribe(stream: Readable): void {
    const unsubscribe = this.unsubscribeMap.get(stream);
    if (unsubscribe) {
      unsubscribe();
    }
  }
}

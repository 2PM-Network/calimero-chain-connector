import * as grpc from "@grpc/grpc-js";
import * as protoloader from "@grpc/proto-loader";
import { getHorizontal } from "~/impl";
import log from "~/log";
import { ProtoGrpcType } from "~/proto/horizontal";
import { AggregationReq__Output } from "~/proto/horizontal/AggregationReq";
import { CalculationReq__Output } from "~/proto/horizontal/CalculationReq";
import { CandidatesReq__Output } from "~/proto/horizontal/CandidatesReq";
import { CreateTaskReq__Output } from "~/proto/horizontal/CreateTaskReq";
import { CreateTaskResp } from "~/proto/horizontal/CreateTaskResp";
import { EndRoundReq__Output } from "~/proto/horizontal/EndRoundReq";
import { FinishTaskReq__Output } from "~/proto/horizontal/FinishTaskReq";
import { HorizontalHandlers } from "~/proto/horizontal/Horizontal";
import { JoinRoundReq__Output } from "~/proto/horizontal/JoinRoundReq";
import { PublicKeyReq__Output } from "~/proto/horizontal/PublicKeyReq";
import { PublicKeyResp } from "~/proto/horizontal/PublicKeyResp";
import { ResultCommitment__Output } from "~/proto/horizontal/ResultCommitment";
import { ResultCommitmentReq__Output } from "~/proto/horizontal/ResultCommitmentReq";
import { ResultCommitmentResp } from "~/proto/horizontal/ResultCommitmentResp";
import { SecretShareReq__Output } from "~/proto/horizontal/SecretShareReq";
import { SecretShareResp } from "~/proto/horizontal/SecretShareResp";
import { Share__Output } from "~/proto/horizontal/Share";
import { ShareCommitment__Output } from "~/proto/horizontal/ShareCommitment";
import { StartRoundReq__Output } from "~/proto/horizontal/StartRoundReq";
import { TaskReq__Output } from "~/proto/horizontal/TaskReq";
import { TaskResp } from "~/proto/horizontal/TaskResp";
import { TaskRoundReq__Output } from "~/proto/horizontal/TaskRoundReq";
import { TaskRoundResp } from "~/proto/horizontal/TaskRoundResp";
import { Transaction } from "~/proto/transaction/Transaction";

const service: HorizontalHandlers = {
  CreateTask(
    call: grpc.ServerUnaryCall<CreateTaskReq__Output, CreateTaskResp>,
    callback: grpc.sendUnaryData<CreateTaskResp>
  ) {
    getHorizontal()
      .createTask(call.request.address, call.request.dataset, call.request.commitment, call.request.taskType)
      .then(([txHash, taskID]) => {
        log.info(`node ${call.request.address} create task ${taskID}`);
        callback(null, { txHash: txHash, taskId: taskID });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  FinishTask(
    call: grpc.ServerUnaryCall<FinishTaskReq__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .finishTask(call.request.address, call.request.taskId)
      .then((txHash) => {
        log.info(`task ${call.request.taskId} finish task`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  GetTask(call: grpc.ServerUnaryCall<TaskReq__Output, TaskResp>, callback: grpc.sendUnaryData<TaskResp>) {
    getHorizontal()
      .getTask(call.request.taskId)
      .then((taskInfo) => {
        log.info(`get task ${call.request.taskId} info`);
        callback(null, taskInfo);
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  StartRound(
    call: grpc.ServerUnaryCall<StartRoundReq__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .startRound(call.request.address, call.request.taskId, call.request.round)
      .then((txHash) => {
        log.info(`task ${call.request.taskId} start round ${call.request.round}`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  JoinRound(
    call: grpc.ServerUnaryCall<JoinRoundReq__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .joinRound(
        call.request.address,
        call.request.taskId,
        call.request.round,
        call.request.pk1,
        call.request.pk2
      )
      .then((txHash) => {
        log.info(`node ${call.request.address} join task ${call.request.taskId} round ${call.request.round}`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  GetTaskRound(
    call: grpc.ServerUnaryCall<TaskRoundReq__Output, TaskRoundResp>,
    callback: grpc.sendUnaryData<TaskRoundResp>
  ) {
    getHorizontal()
      .getTaskRound(call.request.taskId, call.request.round)
      .then((info) => {
        log.info(`get task ${call.request.taskId} round ${call.request.round} info`);
        callback(null, info);
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  SelectCandidates(
    call: grpc.ServerUnaryCall<CandidatesReq__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .selectCandidates(call.request.address, call.request.taskId, call.request.round, call.request.clients)
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} select candidates`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  UploadSeedCommitment(
    call: grpc.ServerUnaryCall<ShareCommitment__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .uploadSeedCommitment(
        call.request.address,
        call.request.taskId,
        call.request.round,
        call.request.receivers,
        call.request.commitments
      )
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} seed commitment 
        ${call.request.address} -> ${call.request.receivers}`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  UploadSecretKeyCommitment(
    call: grpc.ServerUnaryCall<ShareCommitment__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .uploadSecretKeyCommitment(
        call.request.address,
        call.request.taskId,
        call.request.round,
        call.request.receivers,
        call.request.commitments
      )
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} secret key commitment 
        ${call.request.address} -> ${call.request.receivers}`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  GetClientPublickKeys(
    call: grpc.ServerUnaryCall<PublicKeyReq__Output, PublicKeyResp>,
    callback: grpc.sendUnaryData<PublicKeyResp>
  ) {
    getHorizontal()
      .getClientPublicKeys(call.request.taskId, call.request.round, call.request.clients)
      .then((pks) => {
        log.info(
          `task ${call.request.taskId} round ${call.request.round} clients ${call.request.clients} pks`
        );
        const keys = pks.map((item) => {
          return {
            pk1: item[0],
            pk2: item[1],
          };
        });
        callback(null, { keys: keys });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  StartCalculation(
    call: grpc.ServerUnaryCall<CalculationReq__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .startCalculation(call.request.address, call.request.taskId, call.request.round, call.request.clients)
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} start calculation`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  UploadResultCommitment(
    call: grpc.ServerUnaryCall<ResultCommitment__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .uploadResultCommitment(
        call.request.address,
        call.request.taskId,
        call.request.round,
        call.request.commitment
      )
      .then((txHash) => {
        log.info(`node ${call.request.address} task ${call.request} round ${call.request.round}
        upload result commitment`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  GetResultCommitment(
    call: grpc.ServerUnaryCall<ResultCommitmentReq__Output, ResultCommitmentResp>,
    callback: grpc.sendUnaryData<ResultCommitmentResp>
  ) {
    getHorizontal()
      .getResultCommitment(call.request.taskId, call.request.round, call.request.client)
      .then((commitment) => {
        log.info(`get task ${call.request.taskId} round ${call.request.round} result commitment`);
        callback(null, { commitment: commitment });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  StartAggregation(
    call: grpc.ServerUnaryCall<AggregationReq__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .startAggregation(call.request.address, call.request.taskId, call.request.round, call.request.clients)
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} start aggregation`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  UploadSeed(
    call: grpc.ServerUnaryCall<Share__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .uploadSeed(
        call.request.address,
        call.request.taskId,
        call.request.round,
        call.request.senders,
        call.request.shares
      )
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} seed
        ${call.request.senders} -> ${call.request.address}`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  UploadSecretKey(
    call: grpc.ServerUnaryCall<Share__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .uploadSecretKey(
        call.request.address,
        call.request.taskId,
        call.request.round,
        call.request.senders,
        call.request.shares
      )
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} secret key
        ${call.request.senders} -> ${call.request.address}`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  GetSecretShareDatas(
    call: grpc.ServerUnaryCall<SecretShareReq__Output, SecretShareResp>,
    callback: grpc.sendUnaryData<SecretShareResp>
  ) {
    getHorizontal()
      .getSecretShareDatas(
        call.request.taskId,
        call.request.round,
        call.request.senders,
        call.request.receiver
      )
      .then((data) => {
        log.info(`get task ${call.request.taskId} round ${call.request.round}
        ${call.request.senders} -> ${call.request.receiver} secret share data`);
        callback(null, { shares: data });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },

  EndRound(
    call: grpc.ServerUnaryCall<EndRoundReq__Output, Transaction>,
    callback: grpc.sendUnaryData<Transaction>
  ) {
    getHorizontal()
      .endRound(call.request.address, call.request.taskId, call.request.round)
      .then((txHash) => {
        log.info(`task ${call.request.taskId} round ${call.request.round} end`);
        callback(null, { txHash: txHash });
      })
      .catch((err: Error) => {
        log.error(err);
        callback(err, null);
      });
  },
};

export function addService(server: grpc.Server): void {
  const definition = protoloader.loadSync(__dirname + "/../proto/horizontal.proto", {
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(definition) as unknown as ProtoGrpcType;
  server.addService(proto.horizontal.Horizontal.service, service);
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export class GitHubContext {
    eventName: string;
    sha: string;
    ref: string;
    actor: string;
    runNumber: number;
    runId: number;
    workflow: string;

    constructor(eventName: string, sha: string, ref: string, actor: string, runNumber: number, runId: number, workflow: string) {
        this.eventName = eventName;
        this.sha = sha;
        this.ref = ref;
        this.actor = actor;
        this.runNumber = runNumber;
        this.runId = runId;
        this.workflow = workflow;
    }
}

export class BuildVersion {
    versionKey: string;
    versionNumber: number;
    updatedAt: string;
    githubContext?: GitHubContext;

    constructor(versionKey: string, versionNumber: number, updatedAt: string, context?: GitHubContext) {
        this.versionKey = versionKey;
        this.versionNumber = versionNumber;
        this.updatedAt = updatedAt;
        this.githubContext = context;
    }

}

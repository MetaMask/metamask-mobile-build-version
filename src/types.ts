import { DynamoDB } from "aws-sdk";

export class GitHubContext {
    eventName: string;
    sha: string;
    ref: string;
    actor: string;
    runNumber: number;
    runId: number;

    constructor(eventName: string, sha: string, ref: string, actor: string, runNumber: number, runId: number) {
        this.eventName = eventName;
        this.sha = sha;
        this.ref = ref;
        this.actor = actor;
        this.runNumber = runNumber;
        this.runId = runId;
    }
}

export class BuildVersion {
    versionKey: string;
    version: number;
    updatedAt: string;
    githubContext?: GitHubContext;

    constructor(versionKey: string, version: number, updatedAt: string, context?: GitHubContext) {
        this.versionKey = versionKey;
        this.version = version;
        this.updatedAt = updatedAt;
        this.githubContext = context;
    }

    toDynamoDBRecord(): DynamoDB.DocumentClient.AttributeMap {
        return {
            versionKey: this.versionKey,
            version: this.version,
            createdAt: this.updatedAt,
            githubContext: this.githubContext
        };
    }

    static fromDynamoDBRecord(record: DynamoDB.DocumentClient.AttributeMap): BuildVersion {

        console.log('Record:', record);

        return new BuildVersion(
            record.versionKey as string,
            record.version as number,
            record.createdAt ? record.createdAt as string : new Date().toISOString(),
            record.githubContext ? record.githubContext as GitHubContext : undefined
        );
    }
}

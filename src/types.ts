import { DynamoDB } from "aws-sdk";

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

    toDynamoDBRecord(): DynamoDB.DocumentClient.PutItemInputAttributeMap {
        return {
            versionKey: { S: this.versionKey },
            versionNumber: { N: this.versionNumber.toString() }, // DB Expects it as string in underlying by marked with N
            updatedAt: { S: this.updatedAt },
            githubContext: { S: JSON.stringify(this.githubContext) } 
        };
    }

    static fromDynamoDBRecord(record: DynamoDB.DocumentClient.AttributeMap): BuildVersion {

        console.log('Record:', record);

        return new BuildVersion(
            record.versionKey as string,
            record.versionNumber as number,
            record.createdAt ? record.createdAt as string : new Date().toISOString(),
            record.githubContext ? record.githubContext as GitHubContext : undefined
        );
    }
}

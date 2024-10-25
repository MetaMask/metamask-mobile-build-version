import { DynamoDB } from "aws-sdk";
import { BuildVersion } from './types';  // Adjust the import path as necessary


export class Storage {
    private tableName: string;
    private db: DynamoDB.DocumentClient;

    constructor(tableName: string) {
        this.tableName = tableName;
        this.db = new DynamoDB.DocumentClient();
    }

    async getCurrentVersion(): Promise<BuildVersion> {

        const params = {
            TableName: this.tableName,
            Key: {
                versionKey: 'metamask-mobile'
            }
        };

        try {

            //Query the DynamoDB table
            const data = await this.db.get(params).promise();

            if (data.Item) {
                return BuildVersion.fromDynamoDBRecord(data.Item);
            }

            throw new Error('No existing version found in the DynamoDB table.');

        } catch (error) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(error, null, 2));
            throw error;
        }
    }

    async updateVersion(version: BuildVersion): Promise<BuildVersion> {


        const params = {
            TableName: this.tableName,
            Item: version.toDynamoDBRecord()
        };

        try {
            await this.db.put(params).promise();
        
            console.log(`Table Successfully updated.`);
            return await this.getCurrentVersion();

        } catch (error) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(error, null, 2));
            throw error;
        }
    }
}

import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { BuildVersion } from './types';  // Adjust the import path as necessary


export class Storage {
    private tableName: string;
    private db: DynamoDBClient;

    constructor(tableName: string) {
        this.tableName = tableName;
        this.db = new DynamoDBClient({});
    }

    async getCurrentVersion(): Promise<BuildVersion> {
        
        const params = {
            ConsistentRead: true,
            TableName: this.tableName,
            Key: {
                versionKey: { S: 'metamask-mobile' } // Ensure this key structure matches your table's schema
            },   
        };

        try {
            
            const command = new GetItemCommand(params);
            const { Item } = await this.db.send(command);

            if (Item) {
                return BuildVersion.fromDynamoDBRecord(Item);
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
            const command = new PutItemCommand(params);
            await this.db.send(command);

            console.log(`Table Successfully updated.`);
            return await this.getCurrentVersion();

        } catch (error) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(error, null, 2));
            throw error;
        }
    }
}

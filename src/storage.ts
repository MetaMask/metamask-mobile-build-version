import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { BuildVersion } from './types';  // Adjust the import path as necessary
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';


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

            console.log(`Attempting to read item from table: ${this.tableName}`);
            const command = new GetItemCommand(params);
            const response = await this.db.send(command);

            if (!response.Item) {
                throw new Error('No existing version found in the DynamoDB table.');
            }

            const unmarshalledItem = unmarshall(response.Item);
            return new BuildVersion(
                unmarshalledItem.versionKey,
                unmarshalledItem.versionNumber,
                unmarshalledItem.createdAt,
                unmarshalledItem.githubContext
            );


        } catch (error) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(error, null, 2));
            throw error;
        }
    }

    async updateVersion(version: BuildVersion): Promise<BuildVersion> {

        try {

            const params = {
                TableName: this.tableName,
                Item: marshall(version, {
                    convertClassInstanceToMap: true
                }),
            };
    
            console.log('Params:', params);
            console.log(`Attempting to update item in table: ${this.tableName}`);
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

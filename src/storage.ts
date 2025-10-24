import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { BuildVersion } from './types';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

/**
 * Storage class to interact with DynamoDB
 */
export class Storage {
  /**
   * Name of the DynamoDB table to interact with
   */
  private tableName: string;
  /**
   * DynamoDB client instance
   */
  private db: DynamoDBClient;

  constructor(tableName: string, dbClient?: DynamoDBClient) {
    this.tableName = tableName;
    this.db = dbClient ?? new DynamoDBClient({});
  }

  /**
   * Get the current build version information from the DynamoDB table
   * @returns build version
   */
  async getCurrentVersion(versionKey: string): Promise<BuildVersion> {
    // DDB Query
    const params = {
      ConsistentRead: true,
      TableName: this.tableName,
      Key: {
        versionKey: { S: versionKey },
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
        unmarshalledItem.updatedAt,
        unmarshalledItem.githubContext,
      );
    } catch (error) {
      console.error(
        'Unable to read item. Error JSON:',
        error,
      );
      throw error;
    }
  }

  /**
   * Update the build version information in the DynamoDB table
   * @param version build version to update
   * @returns updated build version
   */
  async updateVersion(version: BuildVersion): Promise<BuildVersion> {

    try {
      const params = {
        TableName: this.tableName,
        Item: marshall(version, {
          convertClassInstanceToMap: true,
        }),
      };

      console.log(
        `Attempting to update item in table: ${this.tableName} for version key ${version.versionKey}`,
      );
      const command = new PutItemCommand(params);
      await this.db.send(command);

      console.log(`Table Successfully updated.`);
      return await this.getCurrentVersion(version.versionKey);
      
    } catch (error) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(error, null, 2), error);
      throw error;
    }
  }
}
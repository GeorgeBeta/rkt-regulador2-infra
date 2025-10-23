const { v4: uuidv4 } = require('uuid');

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const { 
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand, 
  PutCommand,
  DeleteCommand
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const INDEX_NAME = process.env.INDEX_NAME;

export const handler = async (event: any = {}): Promise<any> => {
    console.log('Request received:', event);

    try {
        const httpMethod = event.httpMethod;
        const path = event.path;

        console.log(httpMethod);
        console.log(path);

         //FAKE USER ID
        const userId = 'MR_FAKE';

         switch (httpMethod) {
            case 'GET':
                console.log('GET all FilePDFs');
                if (path === '/filepdfs') {
                    return getAllItems();
                }
            case 'POST':
                console.log('POST a new FilePDF');
                if (path === '/filepdfs') {
                    const body = JSON.parse(event.body);
                    return createNewItem(body.filePdfName, body.userId);
                }
            case 'DELETE':
                // Handle DELETE /filepdfs/{id} (delete specific filepdf)
                console.log('delete method');  
                return deleteItem(event.pathParameters.id)
            case 'PATCH':
            // TO IMPLEMENT
            default:
                return createResponse(404, 'Method not found');
        }
    } catch (error) {
        console.error(error);
        return createResponse(500, 'Internal server error');
    }
}

async function getAllItems() {
    console.log('get all items');
    
    const params = {
        TableName: TABLE_NAME
    };
    
    console.log(params);
 
    const scanCommand = new ScanCommand(params);
    const scanResponse = await docClient.send(scanCommand);

    if (!scanResponse.Items) {
        return createResponse(404, 'Items not found')
    }
 
     return createResponse(200, scanResponse.Items)
}



async function createNewItem(fileName: string, userId: string) {
    console.log('create new item');
  
    const newItem = {
      userId: userId,
      createdAt: Date.now().toString(),
      filePdfId: uuidv4(),
      filePDFName: fileName,
      completed: false
    }
  
    // FAKE IT
    const params = {
        TableName: TABLE_NAME,
        Item: {
          userId: newItem.userId,
          createdAt: newItem.createdAt,
          filePdfId: newItem.filePdfId,
          filePDFName: newItem.filePDFName,
          completed: newItem.completed
        }
    };

    console.log(params);
    const putCommand = new PutCommand(params);
    await docClient.send(putCommand);

    return createResponse(200, newItem)
}

async function getItemFromGSI(filePdfId: string) {
    console.log('get item from GSI');

    const queryParams = {
        TableName: TABLE_NAME,
        IndexName: INDEX_NAME,
        KeyConditionExpression: 'filePdfId = :filePdfId',
        ExpressionAttributeValues: {
            ':filePdfId': filePdfId
        },
    };

    console.log(queryParams);
    const queryCommand = new QueryCommand(queryParams);
    const queryResponse = await docClient.send(queryCommand);

    if (!queryResponse.Items || queryResponse.Items.length === 0) {
        return createResponse(404, 'Item not found')
    }

    return queryResponse.Items[0]
}

async function deleteItem(filePdfId: string) {
    console.log('delete item');

    // First we find this item in the GSI
    const item = await getItemFromGSI(filePdfId);

    const itemKey = {
        userId: item.userId,
        createdAt: item.createdAt
    }

    // Then we delete the item
    const deleteParams = {
        TableName: TABLE_NAME,
        Key: itemKey
    };

    console.log(deleteParams);

    const deleteCommand = new DeleteCommand(deleteParams);
    await docClient.send(deleteCommand);

    return createResponse(200, itemKey)
}


function createResponse(statusCode: number, body: any) {
    console.log('create response');
    console.log(body)
    return {
      statusCode: statusCode,
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*', // Restrict this in production
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers':  'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,PATCH,OPTIONS'
      },
      body: JSON.stringify(body)
    }
}

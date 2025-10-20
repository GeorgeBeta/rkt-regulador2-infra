const { v4: uuidv4 } = require('uuid');

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
                    return getAllItems(userId);
                }
            case 'POST':
                console.log('POST a new FilePDF');
                if (path === '/filepdfs') {
                    const body = JSON.parse(event.body);
                    return createNewItem(body.filePdfName, userId);
                }
            case 'DELETE':
            // TO IMPLEMENT
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

async function getAllItems(id: string) {
    console.log('get all items');
     
     const fakeItems = [
         {
             userId: id,
             createdAt: Date.now().toString(),
             filePdfId: '123',
             filePdfName: 'PV3211234',
             completed: false
         },
         {
             userId: id,
             createdAt: Date.now().toString(),
             filePdfId: '456',
             filePdfName: 'PV1234569',
             completed: false
         }
     ]
 
     return createResponse(200, fakeItems)
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
  
    return createResponse(200, newItem)
}

function createResponse(statusCode: number, body: any) {
    console.log('create response');
    console.log(body)
    return {
      statusCode: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    }
}

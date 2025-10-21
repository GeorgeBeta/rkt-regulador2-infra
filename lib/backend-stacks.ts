import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, GlobalSecondaryIndexProps, Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";


export class BackendStack extends Stack {
    public readonly apiUrl: CfnOutput;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        /* Item schema:
        filepdf: {
            userId: string,
            createdAt: string,
            filePdfId: string,
            filePdfName: string,
            completed: boolean
        }
        */
        // Creamos un segundo índice de la base de datos
        const filesPDFTable = new Table(this, `RktRikutec2FilesPDFTableDynamoDB`, {
            partitionKey: {
                name: 'userId',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'createdAt',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        const gsi1: GlobalSecondaryIndexProps = {
            indexName: 'filePdfId-index',
            partitionKey: {
                name: 'filePdfId',
                type: AttributeType.STRING,
            },
        };

        filesPDFTable.addGlobalSecondaryIndex(gsi1);

        // Backend function
        const backendFunction = new NodejsFunction(this, 'RktRegulador2BackendFunction', {
            entry: path.join(__dirname, '../lambda/index.ts'), 
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
    
            // Bundle configuration
            bundling: {
                minify: true,         
                sourceMap: true,      
                externalModules: [    
                    'aws-sdk',
                ],
            },

            environment: {
                TABLE_NAME: filesPDFTable.tableName,
                INDEX_NAME: gsi1.indexName
            }
        });

        // Give permissions to the function to access the dynamodb table FilesPDF
        backendFunction.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
            'dynamodb:PutItem',
            'dynamodb:Query',
            'dynamodb:DeleteItem'

            ],
            resources: [
                filesPDFTable.tableArn,
                `${filesPDFTable.tableArn}/index/*`
            ]
        }));


        // Create API Gateway
        const backendApi = new apigateway.RestApi(this, 'RktRegulador2APIGatewayFiles', {
            restApiName: 'RktRegulador2BackendAPI',
            description: 'API Gateway for the files pdf magnament Backend',
        });

         // Create an API Gateway resource and method
         const integration = new apigateway.LambdaIntegration(backendFunction);

         //Add resources and methods
        const filesPdf = backendApi.root.addResource('filepdfs');
        filesPdf.addMethod('GET', integration);
        filesPdf.addMethod('POST', integration);
    
        // Add /filepdfs/{id} resource
        const filepdfsWithId = filesPdf.addResource('{id}');
        filepdfsWithId.addMethod('DELETE', integration, { // DELETE /filepdfs/{id}
            requestParameters: {
                'method.request.path.id': true  // Makes the id parameter required
            }
        });

        // Output the API Gateway URL
        this.apiUrl = new CfnOutput(this, 'RktRegulador2APIfilesPdf', {
            value: backendApi.url,
            description: 'API Gateway URL para la parte de gestión de las ficheros PDFs'
        });
    }
}

import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class BackendStack extends Stack {
    public readonly apiUrl: CfnOutput;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

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
                //Add environment variables if needed
            }
        });

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
    
        // Output the API Gateway URL
        this.apiUrl = new CfnOutput(this, 'RktRegulador2APIfilesPdf', {
            value: backendApi.url,
            description: 'API Gateway URL para la parte de gestión de las ficheros PDFs'
        });
    }
}

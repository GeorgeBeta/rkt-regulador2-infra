import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, GlobalSecondaryIndexProps, Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { ARecord, RecordTarget, HostedZone } from "aws-cdk-lib/aws-route53";
import { ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets";

interface BackendStackProps extends StackProps {
    readonly userPoolArn: string;
    readonly apiDomainName: string;
    readonly hostedZoneDomain: string;
}

export class BackendStack extends Stack {
    public readonly apiUrl: CfnOutput;

    constructor(scope: Construct, id: string, props: BackendStackProps) {
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
            'dynamodb:DeleteItem',
            'dynamodb:Scan'
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
            defaultCorsPreflightOptions: {
                allowOrigins: ['*'], // You should restrict this to specific domains in production
                allowMethods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Amz-Date',
                    'X-Api-Key',
                    'X-Amz-Security-Token'
                ],
                allowCredentials: true, // Set to true if you need to support credentials
                maxAge: Duration.days(1) // Cache preflight results for 1 day (optional)
            }
        });

        // Custom Domain Configuration
        const domainName = props.apiDomainName;

        // Get the hosted zone for your domain
        const hostedZone = HostedZone.fromLookup(this, 'TestHostedZone', {
            domainName: props.hostedZoneDomain,
        });

        // Create SSL certificate in current region for regional endpoint
        const certificate = new Certificate(this, 'TestApiCertificate', {
            domainName: domainName,
            validation: CertificateValidation.fromDns(hostedZone),
        });

        // Create custom domain for API Gateway (regional endpoint)
        const customDomain = new apigateway.DomainName(this, 'TestCustomDomain', {
            domainName: domainName,
            certificate: certificate,
            endpointType: apigateway.EndpointType.REGIONAL,
        });

        // Map the custom domain to the API
        customDomain.addBasePathMapping(backendApi);

        // Create Route53 record
        new ARecord(this, 'ApiAliasRecord', {
            zone: hostedZone,
            recordName: 'test',
            target: RecordTarget.fromAlias(
                new ApiGatewayDomain(customDomain)
            ),
        });

        // Create authorizers
        const userPool = UserPool.fromUserPoolArn(this, 'ImportedUserPool', props.userPoolArn);
        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'TodoWebAppAuthorizer', {
            cognitoUserPools: [userPool]
        });

       // Create method options with authorization
        const methodOptions: apigateway.MethodOptions = {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO
        };

         // Create an API Gateway resource and method
         const integration = new apigateway.LambdaIntegration(backendFunction);

         //Add resources and methods
        const filesPdf = backendApi.root.addResource('filepdfs');
        filesPdf.addMethod('GET', integration, methodOptions);
        filesPdf.addMethod('POST', integration, methodOptions);
    
        // Add /filepdfs/{id} resource
        const filepdfsWithId = filesPdf.addResource('{id}');
        filepdfsWithId.addMethod('DELETE', integration, { // DELETE /filepdfs/{id}
            ...methodOptions,
            requestParameters: {
                'method.request.path.id': true  // Makes the id parameter required
            }
        });

        // Output the API Gateway URL
        this.apiUrl = new CfnOutput(this, 'RktRegulador2APIfilesPdf', {
            value: `https://${domainName}/`,
            description: 'API Gateway URL para la parte de gestión de las ficheros PDFs'
        });
    }
}

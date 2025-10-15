import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { IdentityPool, UserPoolAuthenticationProvider } from "aws-cdk-lib/aws-cognito-identitypool";
import { Construct } from "constructs";

export class CognitoStack extends Stack {
	public readonly userPoolId: CfnOutput;
	public readonly userPoolClientId: CfnOutput;
	public readonly identityPoolId: CfnOutput;
	public readonly userPoolArn: CfnOutput;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Crear el "User Pool" -responsable del sign in, sign up y user verification
        const userPool = new UserPool(this, 'UserPoolRktRegulador2', {
            userPoolName: 'UserPoolRktRegulador2',
            selfSignUpEnabled: true,        // Permite que el usuario sign up
            autoVerify: { email: true },    // Verificar el email del usuario enviando un código de verificación
            signInAliases: { email: true }, // Fijar el email com un alias, permitir el email como user login
        });

        //Crear el "User Pool Client"
        const userPoolClient = new UserPoolClient(
            this,
            'UserPoolClientRktRegulador2',
            {
                userPool,
                generateSecret: false,  // No es necesario generar un secreto para la aplicación web que se 
                                        // ejecuta en los navegadores
            }
        );

        // Crear un "Identity Pool"
        const identityPool = new IdentityPool(this, 'IdentityPoolRktRegulador2', {
            allowUnauthenticatedIdentities: true,
            authenticationProviders: {
                userPools: [
                    new UserPoolAuthenticationProvider({
                        userPool: userPool,
                        userPoolClient: userPoolClient,
                    })
                ],
            }
        })
        this.userPoolId = new CfnOutput(this, 'CFUserPoolRktRegulador2', {
            value: userPool.userPoolId,
        });
        this.userPoolClientId = new CfnOutput(this, 'CFUserPoolClientRktRegulador2', {
            value: userPoolClient.userPoolClientId,
        });
        this.identityPoolId = new CfnOutput(this, 'CFIdentityPoolRktRegulador2', {
            value: identityPool.identityPoolId,
        });
        this.userPoolArn = new CfnOutput(this, 'CFUserPoolArnRktRegulador2', {
            value: userPool.userPoolArn,
        });
    }
}

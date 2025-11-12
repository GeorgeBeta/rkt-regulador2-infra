import { CfnOutput, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
	App,
	GitHubSourceCodeProvider,
	RedirectStatus,
} from '@aws-cdk/aws-amplify-alpha';

interface AmplifyStackProps extends StackProps {
	readonly userPoolId: string;
	readonly userPoolClientId: string;
	readonly identityPoolId: string;
	readonly serverURL: string;
	readonly customDomain?: string;
	readonly certificateArn?: string;
}


export class AmplifyHostingStack extends Stack {
	constructor(scope: Construct, id: string, props: AmplifyStackProps) {
		super(scope, id, props);

        // Create the Amplify application
		const amplifyApp = new App(this, `RktRegulador2WebApp`, {
			sourceCodeProvider: new GitHubSourceCodeProvider({
				owner: 'GeorgeBeta',
				repository: 'rkt-regulador2-frontend',
				oauthToken: SecretValue.secretsManager('github-token'),
			}),
			environmentVariables: {
				REGION: this.region,
				IS_MOCK: 'false',
				USER_POOL_ID: props.userPoolId,
				USER_POOL_CLIENT_ID: props.userPoolClientId,
				IDENTITY_POOL_ID: props.identityPoolId,
				SERVER_URL: props.serverURL,
            },
		});

        // Agregar una nueva rama para el desarrollo: En nuestro caso tenemos una rama que es la principal
        // y es la de producción y queremos que se construya automáticamente, así que cada vez que hacemos
        // algo se trasladará a la rama.
        const main = amplifyApp.addBranch('master', {
            autoBuild: true,
            stage: 'PRODUCTION'
        });
        // Agregamos una ruta personaliza, esto es muy útil para ciertas aplicaciones cuando trabajamos con 
        // aplicaciones d una sola página (Reac o Nue)  y esto nos permitirá redirigir ciertas solicitudes 
        // al índice HTML
        amplifyApp.addCustomRule({
			source:
				'</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>',
			target: '/index.html',
			status: RedirectStatus.REWRITE,
		});

        // Add custom domain if provided
        if (props.customDomain && props.certificateArn) {
            const domain = amplifyApp.addDomain(props.customDomain, {
                subDomains: [
                    {
                        branch: main,
                        prefix: 'rkt-regulador'
                    }
                ]
            });
        }

        // Agregamos un par de salidas de transformación que se mostrarán en la terminal cuando se implemente 
        // la aplicación. También usaremos esto más adelante para pasar información entre stacks
        new CfnOutput(this, 'AmplifyAppName', {
			value: amplifyApp.appName,
		});

		new CfnOutput(this, 'AmplifyURL', {
			value: `https://main.${amplifyApp.defaultDomain}`,
		});
    }
}

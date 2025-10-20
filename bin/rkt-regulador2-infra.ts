#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AmplifyHostingStack } from '../lib/rkt-regulador2-infra-stack';
import { CognitoStack } from '../lib/cognito-stacks';
import { BackendStack } from '../lib/backend-stacks';

const app = new cdk.App()

const cognitoStack = new CognitoStack(app, 'RktRegulador2CognitoStack', {});

const backendStack = new BackendStack(app, 'RktRegulador2BackendStack', {});

const amplifyStack = new AmplifyHostingStack(app, 'RktRegulador2AppAmplifyHostingStack', {
    userPoolId: cognitoStack.userPoolId.value,
    userPoolClientId: cognitoStack.userPoolClientId.value,
    identityPoolId: cognitoStack.identityPoolId.value,
    serverURL: backendStack.apiUrl.value
});

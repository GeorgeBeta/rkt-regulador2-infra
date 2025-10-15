#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AmplifyHostingStack } from '../lib/rkt-regulador2-infra-stack';

const app = new cdk.App();

const amplifyStack = new AmplifyHostingStack(app, 'RktRegulador2AppAmplifyHostingStack', {});

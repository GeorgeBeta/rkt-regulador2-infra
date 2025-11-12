import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone } from "aws-cdk-lib/aws-route53";

interface CertificateStackProps extends StackProps {
    readonly hostedZoneDomain: string;
}

export class CertificateStack extends Stack {
    public readonly certificateArn: CfnOutput;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, props);

        // Get the hosted zone for your domain
        const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.hostedZoneDomain,
        });

        // Create SSL certificate for Amplify (CloudFront requirement - must be in us-east-1)
        const certificate = new Certificate(this, 'AmplifyCertificate', {
            domainName: `*.${props.hostedZoneDomain}`, // Wildcard for subdomains
            validation: CertificateValidation.fromDns(hostedZone),
        });

        // Output the certificate ARN
        this.certificateArn = new CfnOutput(this, 'CertificateArn', {
            value: certificate.certificateArn,
            description: 'Certificate ARN for Amplify custom domain'
        });
    }
}
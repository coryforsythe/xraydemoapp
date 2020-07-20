import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as iam from "@aws-cdk/aws-iam";
import * as apigateway from "@aws-cdk/aws-apigateway";
import { CfnOutput } from '@aws-cdk/core';

export class XrayappStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Keep this demo in a VPC
    const vpc = new ec2.Vpc(this, "demovpc", {
      maxAzs: 3 // Default is all AZs in region
    });
  
    //An ECS Cluster where we will run Fargate Services and Tasks
    const cluster = new ecs.Cluster(this, "XrayAppDemoCluster", {
      vpc: vpc,
    });

    //A somewhat permissive IAM policy....its only a demo
    const taskPolicy= new iam.PolicyDocument();
    taskPolicy.addStatements( new iam.PolicyStatement({
      effect:iam.Effect.ALLOW,
      actions:["*"],
      resources:["*"]

    }))

    //Wire up the policy to a role for ecs fargate to use
    const taskRole=new iam.Role(this,"xrayappriole",{
      assumedBy:new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      inlinePolicies:{
        "taskrolepolicy":taskPolicy
      }
    });

    //A Fargate task deifinition for our containers
    const taskDef=new ecs.FargateTaskDefinition(this,"xraydemo",{
      cpu:512,
      memoryLimitMiB:1024,
      family:"xraydemo",
      taskRole:taskRole
    });

    //Add the Application from our docker container
    const apiContainer=taskDef.addContainer("citystateapi",{
      image:ecs.ContainerImage.fromRegistry("awscory/citystateapi"),
      cpu:256,
      essential:true,
      memoryLimitMiB:512,

    }).addPortMappings({
      containerPort:3000,
      protocol:ecs.Protocol.TCP
    })
    
    //Add the AWS XRAY SideCar
    const xrayContainer=taskDef.addContainer("xray",{
      image:ecs.ContainerImage.fromRegistry("amazon/aws-xray-daemon"),
      cpu:256,
      essential:true,
      memoryLimitMiB:512,

    }).addPortMappings({
      containerPort:2000,
      protocol:ecs.Protocol.UDP
    })


    // Create a load-balanced Fargate service and make it public
    const fargateSvc=new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster, // Required
      cpu: 512, // Default is 256
      desiredCount: 1, // Default is 1
      taskDefinition:taskDef,
      memoryLimitMiB: 2048, // Default is 512
      listenerPort:80,
      publicLoadBalancer: true // Default is false

    });

    //Add some APIGateway Love
    const api = new apigateway.RestApi(this, 'xrayapi');
    api.root.addMethod('ANY');
    const zpapi = api.root.addResource('zipcode');
    zpapi.addMethod('GET',new apigateway.HttpIntegration('http://'+fargateSvc.loadBalancer.loadBalancerDnsName));

    //Output the APIGateway path
    const output=new CfnOutput(this,"URL",{
      value:'http://'+fargateSvc.loadBalancer.loadBalancerDnsName
    })
  }
}

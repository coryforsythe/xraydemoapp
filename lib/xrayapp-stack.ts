import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as iam from "@aws-cdk/aws-iam";

export class XrayappStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "demovpc", {
      maxAzs: 3 // Default is all AZs in region
    });
  
    const cluster = new ecs.Cluster(this, "XrayAppDemoCluster", {
      vpc: vpc,
    });

    const taskPolicy= new iam.PolicyDocument();
    taskPolicy.addStatements( new iam.PolicyStatement({
      effect:iam.Effect.ALLOW,
      actions:["*"],
      resources:["*"]

    }))

    const taskRole=new iam.Role(this,"xrayappriole",{
      assumedBy:new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      inlinePolicies:{
        "taskrolepolicy":taskPolicy
      }
    });

    const taskDef=new ecs.FargateTaskDefinition(this,"xraydemo",{
      cpu:512,
      memoryLimitMiB:1024,
      family:"xraydemo",
      taskRole:taskRole
    });


    const apiContainer=taskDef.addContainer("citystateapi",{
      image:ecs.ContainerImage.fromRegistry("awscory/citystateapi"),
      cpu:256,
      essential:true,
      memoryLimitMiB:512,

    }).addPortMappings({
      containerPort:3000,
      protocol:ecs.Protocol.TCP
    })
    
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
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster, // Required
      cpu: 512, // Default is 256
      desiredCount: 1, // Default is 1
      taskDefinition:taskDef,
      memoryLimitMiB: 2048, // Default is 512
      listenerPort:3000,
      publicLoadBalancer: true // Default is false

    });
  }
}

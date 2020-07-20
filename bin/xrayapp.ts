#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { XrayappStack } from '../lib/xrayapp-stack';

const app = new cdk.App();
new XrayappStack(app, 'XrayappStack');

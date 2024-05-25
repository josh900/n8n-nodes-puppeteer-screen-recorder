import { IExecuteFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';

export class PuppeteerScreenRecorder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Puppeteer Screen Recorder',
    name: 'puppeteerScreenRecorder',
    icon: 'file:puppeteer.svg',
    group: ['transform'],
    version: 1,
    description: 'Record screen using Puppeteer',
    defaults: {
      name: 'Puppeteer Screen Recorder',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'URL of website to record',
      },
      {
        displayName: 'Resolution Width',
        name: 'resolutionWidth',
        type: 'number',
        default: 1280,
        required: true,
        description: 'Width of recording resolution',
      },
      {
        displayName: 'Resolution Height',  
        name: 'resolutionHeight',
        type: 'number',
        default: 720,
        required: true,
        description: 'Height of recording resolution',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const url = this.getNodeParameter('url', i) as string;
      const resolutionWidth = this.getNodeParameter('resolutionWidth', i) as number;
      const resolutionHeight = this.getNodeParameter('resolutionHeight', i) as number;

      const recorder = new PuppeteerScreenRecorder(); 
      await recorder.start(`/home/node/.n8n/output-${i}.mp4`);

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setViewport({ width: resolutionWidth, height: resolutionHeight });
      await page.goto(url);

      await recorder.stop();
      await browser.close();

      const binaryFile = await this.helpers.prepareBinaryData(`/home/node/.n8n/output-${i}.mp4`);

      returnData.push({
        binary: {
          data: binaryFile,
        },
      });
    }

    return this.prepareOutputData(returnData);
  }
}
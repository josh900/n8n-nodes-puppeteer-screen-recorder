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
    description: 'Record a website screen using Puppeteer',
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
        placeholder: 'https://example.com',
        description: 'The URL of the website to record',
        required: true,
      },
      {
        displayName: 'Output File Name',
        name: 'fileName',
        type: 'string',
        default: 'recording.mp4',
        description: 'The file name for the screen recording output',
        required: true,
      },
      {
        displayName: 'Resolution Width',
        name: 'resolutionWidth',
        type: 'number',
        default: 1280,
        description: 'The width of the recording resolution',
      },
      {  
        displayName: 'Resolution Height',
        name: 'resolutionHeight',
        type: 'number',
        default: 720,
        description: 'The height of the recording resolution',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

    const items = this.getInputData();

    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {

      const url = this.getNodeParameter('url', i) as string;
      const fileName = this.getNodeParameter('fileName', i) as string;
      const resolutionWidth = this.getNodeParameter('resolutionWidth', i) as number;
      const resolutionHeight = this.getNodeParameter('resolutionHeight', i) as number;

      const recorder = new PuppeteerScreenRecorder({
        followNewTab: true,
        fps: 60,
        videoFrame: {
          width: resolutionWidth, 
          height: resolutionHeight,
        },
        aspectRatio: `${resolutionWidth}:${resolutionHeight}`,
      });
      
      await recorder.start(fileName);

      await recorder.page.goto(url, { waitUntil: 'networkidle0' });

      await recorder.stop();

      const outputFile = await this.helpers.prepareBinaryData(Buffer.from(recorder.video), fileName);

      returnData.push({
        binary: {
          recording: outputFile,
        }
      });

    }

    return this.prepareOutputData(returnData);
  }
}
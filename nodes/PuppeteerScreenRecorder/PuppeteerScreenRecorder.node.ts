import { IExecuteFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';

export class PuppeteerScreenRecorder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Puppeteer Screen Recorder',
    name: 'puppeteerScreenRecorder',
    icon: 'file:puppeteer.svg',
    group: ['transform'],
    version: 1,
    description: 'Record a website using Puppeteer and puppeteer-screen-recorder',
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
        placeholder: 'https://example.com',
        description: 'The URL of the website to record',
      },
      {
        displayName: 'Width',
        name: 'width',
        type: 'number',
        default: 1280,
        description: 'The width of the recording resolution',
      },
      {
        displayName: 'Height',
        name: 'height',
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
      const width = this.getNodeParameter('width', i) as number;
      const height = this.getNodeParameter('height', i) as number;

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setViewport({ width, height });

      const recorder = new PuppeteerScreenRecorder(page);
      await recorder.start();

      await page.goto(url, { waitUntil: 'networkidle0' });

      const videoBuffer = await recorder.stop();

      await browser.close();

      const binaryData = await this.helpers.prepareBinaryData(
        videoBuffer,
        'video.webm'
      );

      returnData.push({
        json: {},
        binary: {
          data: binaryData,
        },
      });
    }

    return this.prepareOutputData(returnData);
  }
}
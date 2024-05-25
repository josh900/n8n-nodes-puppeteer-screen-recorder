import { IExecuteFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';

export class PuppeteerScreenRecorder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Puppeteer Screen Recorder',
    name: 'puppeteerScreenRecorder',
    icon: 'file:puppeteer.svg',
    group: ['transform'],
    version: 1,
    description: 'Record a website using Puppeteer',
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
        required: true,
        default: '',
        description: 'The URL of the website to record',
      },
      {
        displayName: 'Duration',
        name: 'duration',
        type: 'number',
        required: true,
        default: 5,
        description: 'The duration of the recording in seconds',
      },
      {
        displayName: 'Resolution',
        name: 'resolution',
        type: 'options',
        options: [
          {
            name: '1280x720',
            value: '1280x720',
          },
          {
            name: '1920x1080',
            value: '1920x1080',
          },
        ],
        default: '1280x720',
        description: 'The resolution of the recording',
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        required: true,
        default: 'recording.webm',
        description: 'The file name to save the recording as',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const url = this.getNodeParameter('url', i) as string;
      const duration = this.getNodeParameter('duration', i) as number;
      const resolution = this.getNodeParameter('resolution', i) as string;
      const fileName = this.getNodeParameter('fileName', i) as string;

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();

      const [width, height] = resolution.split('x').map(Number);
      await page.setViewport({ width, height });

      const recorder = new PuppeteerScreenRecorder(page);
      await recorder.start();

      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(duration * 1000);

      const videoBuffer = await recorder.stop();

      await browser.close();

      const data = await this.helpers.prepareBinaryData(videoBuffer, fileName);

      returnData.push({
        json: {},
        binary: {
          data,
        },
      });
    }

    return this.prepareOutputData(returnData);
  }
}
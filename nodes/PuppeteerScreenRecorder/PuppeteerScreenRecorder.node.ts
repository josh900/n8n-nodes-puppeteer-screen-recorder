import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import puppeteer from 'puppeteer';

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
        required: true,
      },
      {
        displayName: 'Duration (seconds)',
        name: 'duration',
        type: 'number',
        default: 5,
        required: true,
      },
      {
        displayName: 'Width',
        name: 'width',
        type: 'number',
        default: 1280,
        required: true,
      },
      {
        displayName: 'Height',
        name: 'height',
        type: 'number',
        default: 720,
        required: true,
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: 'recording.mp4',
        required: true,
      },
      {
        displayName: 'Binary Property',
        name: 'binaryProperty',
        type: 'string',
        default: 'data',
        required: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const url = this.getNodeParameter('url', itemIndex, '') as string;
      const duration = this.getNodeParameter('duration', itemIndex, 5) as number;
      const width = this.getNodeParameter('width', itemIndex, 1280) as number;
      const height = this.getNodeParameter('height', itemIndex, 720) as number;
      const fileName = this.getNodeParameter('fileName', itemIndex, 'recording.mp4') as string;
      const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width, height });

      const recorder = new PuppeteerScreenRecorder(page);
      await recorder.start(fileName);

      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((resolve) => setTimeout(resolve, duration * 1000));

      await recorder.stop();
      const recordingBuffer = await recorder.getRecording();

      await browser.close();

      const data = await this.helpers.prepareBinaryData(recordingBuffer, fileName);

      returnData.push({
        json: {},
        binary: {
          [binaryProperty]: data,
        },
      });
    }

    return this.prepareOutputData(returnData);
  }
}
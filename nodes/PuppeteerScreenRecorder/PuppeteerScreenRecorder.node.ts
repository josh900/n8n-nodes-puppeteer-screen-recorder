import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeType, INodeTypeDescription, IBinaryData } from 'n8n-workflow';
import { PuppeteerScreenRecorder as Recorder } from 'puppeteer-screen-recorder';
import puppeteer from 'puppeteer';

export class PuppeteerScreenRecorder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Puppeteer Screen Recorder',
    name: 'puppeteerScreenRecorder',
    icon: 'file:puppeteer.svg',
    group: ['transform'],
    version: 1,
    description: 'Record website screens using Puppeteer and Puppeteer Screen Recorder',
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
        description: 'The URL of the website to record',
      },
      {
        displayName: 'Output File Name',
        name: 'outputFilename',
        type: 'string',
        default: 'recording.mp4',
        required: true,
        description: 'The name of the output file for the screen recording',
      },
      {
        displayName: 'Recording Duration',
        name: 'duration',
        type: 'number',
        default: 5,
        required: true,
        description: 'The duration of the screen recording in seconds',
      },
      {
        displayName: 'Recording Resolution',
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
          {
            name: '2560x1440',
            value: '2560x1440',
          },
          {
            name: '3840x2160',
            value: '3840x2160',
          },
        ],
        default: '1280x720',
        required: true,
        description: 'The resolution of the screen recording',
      },
      {
        displayName: 'Frame Rate',
        name: 'frameRate',
        type: 'number',
        default: 30,
        required: true,
        description: 'The frame rate of the screen recording',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const url = this.getNodeParameter('url', i) as string;
      const outputFilename = this.getNodeParameter('outputFilename', i) as string;
      const duration = this.getNodeParameter('duration', i) as number;
      const resolution = this.getNodeParameter('resolution', i) as string;
      const frameRate = this.getNodeParameter('frameRate', i) as number;

      const [width, height] = resolution.split('x').map(Number);

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setViewport({ width, height });

      const recorder = new Recorder(page);
      await recorder.start(outputFilename, {
        fps: frameRate,
        videoFrame: { width, height },
      });

      await page.goto(url, { waitUntil: 'networkidle0' });

      await new Promise((resolve) => setTimeout(resolve, duration * 1000));

      await recorder.stop();
      await browser.close();

      const binaryData = await this.helpers.readBinaryFile(outputFilename);
      returnData.push({
        json: {},
        binary: {
          data: binaryData,
          mimeType: 'video/mp4' as unknown as IBinaryData,
          fileName: outputFilename as unknown as IBinaryData,
        },
      });
    }

    return this.prepareOutputData(returnData);
  }
}
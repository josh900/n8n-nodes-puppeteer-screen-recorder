import { IExecuteFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { PuppeteerScreenRecorder as Recorder } from 'puppeteer-screen-recorder';
import puppeteer from 'puppeteer';

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
        displayName: 'Output File Name',
        name: 'outputFileName',
        type: 'string',
        default: 'recording.mp4',
        required: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const url = this.getNodeParameter('url', 0) as string;
    const width = this.getNodeParameter('width', 0) as number;
    const height = this.getNodeParameter('height', 0) as number;
    const outputFileName = this.getNodeParameter('outputFileName', 0) as string;

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    const recorder = new Recorder(page, {
      fps: 30,
      videoFrame: { width, height },
    });

    try {
      await recorder.start();
      await page.goto(url, { waitUntil: 'networkidle0' });
      await recorder.stop();

      const videoBuffer = await recorder.getRecording();

      const data = await this.helpers.prepareBinaryData(
        videoBuffer as Buffer,
        outputFileName
      );

      return [
        [
          {
            json: {},
            binary: { data },
          },
        ],
      ];
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
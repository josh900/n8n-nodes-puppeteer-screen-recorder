import { 
  IExecuteFunctions,
  NodeApiError,
  NodeOperationError,
  NodeConnectionType,
} from 'n8n-workflow';
import { 
  INodeExecutionData, 
  INodeType, 
  INodeTypeDescription,
} from 'n8n-workflow';
import { PuppeteerScreenRecorder as Recorder } from 'puppeteer-screen-recorder';
import type { Browser, PuppeteerLaunchOptions } from 'puppeteer';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

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
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
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
        description: 'The width of the recording viewport',
      },
      {
        displayName: 'Height',
        name: 'height',
        type: 'number',
        default: 720,
        description: 'The height of the recording viewport',
      },
      {
        displayName: 'Duration',
        name: 'duration',
        type: 'number',
        default: 5,
        description: 'The duration of the recording in seconds',
      },
      {
        displayName: 'Frame Rate',
        name: 'frameRate',
        type: 'number',
        default: 25,
        description: 'The frame rate of the recording',
      },
      {
        displayName: 'Output File Name',
        name: 'outputFileName',
        type: 'string',
        default: 'recording.mp4',
        description: 'The name of the output file',
      },
      {
        displayName: 'Video Format',
        name: 'videoFormat',
        type: 'options',
        default: 'mp4',
        options: [
          { name: 'MP4', value: 'mp4' },
          { name: 'AVI', value: 'avi' },
          { name: 'WEBM', value: 'webm' },
          { name: 'MOV', value: 'mov' }
        ],
        description: 'The format of the output video file',
      },
      {
        displayName: 'Video Quality',
        name: 'videoQuality',
        type: 'number',
        default: 80,
        description: 'The quality of the video (1-100)',
      },
      {
        displayName: 'Follow New Tabs',
        name: 'followNewTab',
        type: 'boolean',
        default: true,
        description: 'Whether to follow and record new tabs opened during recording',
      }
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      let browser: Browser | null = null;
      let recorder: Recorder | null = null;

      const cleanup = async () => {
        try {
          if (recorder) {
            await recorder.stop();
            recorder = null;
          }
          if (browser) {
            await browser.close();
            browser = null;
          }
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      };

      try {
        const url = this.getNodeParameter('url', i) as string;
        const width = this.getNodeParameter('width', i) as number;
        const height = this.getNodeParameter('height', i) as number;
        const duration = this.getNodeParameter('duration', i) as number;
        const frameRate = this.getNodeParameter('frameRate', i) as number;
        const videoFormat = this.getNodeParameter('videoFormat', i) as string;
        const videoQuality = this.getNodeParameter('videoQuality', i) as number;
        const followNewTab = this.getNodeParameter('followNewTab', i) as boolean;

        const outputFileName = `${this.getNodeParameter('outputFileName', i)}`.endsWith(`.${videoFormat}`) 
          ? this.getNodeParameter('outputFileName', i) as string
          : `${this.getNodeParameter('outputFileName', i)}.${videoFormat}`;

        const launchOptions: PuppeteerLaunchOptions = {
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          headless: true as any,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ],
        };

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        await page.setViewport({ width, height });

        recorder = new Recorder(page, {
          fps: frameRate,
          followNewTab,
          videoFrame: { width, height },
          aspectRatio: '16:9',
          videoCrf: 18,
          videoCodec: 'libx264',
          videoPreset: 'ultrafast',
          videoBitrate: 1000,
          autopad: { color: 'black' },
          recordDurationLimit: duration
        });

        const outputPath = path.join('/tmp', outputFileName);
        await recorder.start(outputPath);
        await page.goto(url, { waitUntil: 'networkidle0' });
        await new Promise((resolve) => setTimeout(resolve, duration * 1000));
        await recorder.stop();
        await browser.close();
        browser = null;
        recorder = null;

        const videoData = fs.readFileSync(outputPath);
        const binaryData = await this.helpers.prepareBinaryData(videoData, outputFileName);

        returnData.push({
          json: {
            success: true,
            file: outputFileName,
            format: videoFormat,
            duration,
            width,
            height,
            frameRate,
            url
          },
          binary: {
            data: binaryData,
          },
        });

      } catch (error) {
        await cleanup();
        throw new NodeOperationError(
          this.getNode(),
          `Recording failed: ${(error as Error).message}`,
          { description: 'Error occurred while recording website' }
        );
      }
    }

    return this.prepareOutputData(returnData);
  }
}

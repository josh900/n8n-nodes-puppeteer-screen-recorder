import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { PuppeteerScreenRecorder as Recorder } from 'puppeteer-screen-recorder';
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
        displayName: 'Enable Debug Logs',
        name: 'enableDebugLogs',
        type: 'boolean',
        default: false,
        description: 'Whether to enable debug logging',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const enableDebugLogs = this.getNodeParameter('enableDebugLogs', i) as boolean;
      const logger = (message: string) => {
        if (enableDebugLogs) {
          console.log(`[Puppeteer Screen Recorder][${new Date().toISOString()}] ${message}`);
        }
      };

      try {
        logger('Starting recording process');
        
        const url = this.getNodeParameter('url', i) as string;
        const width = this.getNodeParameter('width', i) as number;
        const height = this.getNodeParameter('height', i) as number;
        const duration = this.getNodeParameter('duration', i) as number;
        const frameRate = this.getNodeParameter('frameRate', i) as number;
        const outputFileName = this.getNodeParameter('outputFileName', i) as string;

        logger(`Configuration: URL=${url}, Width=${width}, Height=${height}, Duration=${duration}s, FPS=${frameRate}`);

        logger('Launching browser');
        const browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        logger('Creating new page');
        const page = await browser.newPage();
        await page.setViewport({ width, height });
        logger('Viewport set');

        logger('Initializing recorder');
        const recorder = new Recorder(page, {
          fps: frameRate,
          videoFrame: { width, height },
        });

        const outputPath = path.join('/tmp', outputFileName);
        logger(`Starting recording to ${outputPath}`);
        await recorder.start(outputPath);

        logger(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        logger('Page loaded, recording in progress');

        logger(`Waiting for ${duration} seconds`);
        await new Promise((resolve) => setTimeout(resolve, duration * 1000));

        logger('Stopping recording');
        await recorder.stop();

        logger('Closing browser');
        await browser.close();

        logger('Reading video file');
        const videoData = fs.readFileSync(outputPath);
        logger('Preparing binary data');
        const binaryData = await this.helpers.prepareBinaryData(videoData, outputFileName);

        logger('Recording completed successfully');
        returnData.push({
          json: {
            success: true,
            fileName: outputFileName,
            duration,
            timestamp: new Date().toISOString(),
          },
          binary: {
            data: binaryData,
          },
        });

      } catch (error) {
        logger(`Error occurred: ${error.message}`);
        throw error;
      }
    }

    return this.prepareOutputData(returnData);
  }
}

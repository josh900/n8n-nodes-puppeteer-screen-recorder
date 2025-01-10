import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { LoggerProxy as Logger } from 'n8n-workflow';
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
      let browser: puppeteer.Browser | null = null;
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
          Logger.error(`[PuppeteerScreenRecorder] Cleanup error: ${error}`);
        }
      };

      try {
        Logger.info(`[PuppeteerScreenRecorder] Starting execution for item ${i}`);

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

        Logger.debug(`[PuppeteerScreenRecorder] Parameters: url=${url}, width=${width}, height=${height}, duration=${duration}, frameRate=${frameRate}, outputFileName=${outputFileName}`);

        Logger.info('[PuppeteerScreenRecorder] Launching browser');
        browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          headless: "new",
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ],
        });

        Logger.info('[PuppeteerScreenRecorder] Creating new page');
        const page = await browser.newPage();
        await page.setViewport({ width, height });

        Logger.info('[PuppeteerScreenRecorder] Initializing recorder');
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
        Logger.info(`[PuppeteerScreenRecorder] Starting recording to ${outputPath}`);
        await recorder.start(outputPath);

        Logger.info(`[PuppeteerScreenRecorder] Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });

        Logger.info(`[PuppeteerScreenRecorder] Waiting for ${duration} seconds`);
        await new Promise((resolve) => setTimeout(resolve, duration * 1000));

        Logger.info('[PuppeteerScreenRecorder] Stopping recording');
        await recorder.stop();

        Logger.info('[PuppeteerScreenRecorder] Closing browser');
        await browser.close();
        browser = null;
        recorder = null;

        Logger.info('[PuppeteerScreenRecorder] Reading recorded file');
        const videoData = fs.readFileSync(outputPath);
        
        Logger.info('[PuppeteerScreenRecorder] Preparing binary data');
        const binaryData = await this.helpers.prepareBinaryData(videoData, outputFileName);

        returnData.push({
          json: {},
          binary: {
            data: binaryData,
          },
        });

        Logger.info(`[PuppeteerScreenRecorder] Successfully processed item ${i}`);

      } catch (error) {
        Logger.error('[PuppeteerScreenRecorder] Error details:', {
          error: error.message,
          stack: error.stack,
          executable: process.env.PUPPETEER_EXECUTABLE_PATH,
          exists: fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH),
        });
        await cleanup();
        Logger.error(`[PuppeteerScreenRecorder] Error processing item ${i}: ${error}`);
        throw error;
      }
    }

    return this.prepareOutputData(returnData);
  }
}

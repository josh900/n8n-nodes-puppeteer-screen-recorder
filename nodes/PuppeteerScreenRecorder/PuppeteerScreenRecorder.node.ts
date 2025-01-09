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
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    this.logger.info('Starting PuppeteerScreenRecorder execution');
    const startTime = Date.now();

    for (let i = 0; i < items.length; i++) {
      try {
        this.logger.debug(`Processing item ${i + 1} of ${items.length}`);
        
        const url = this.getNodeParameter('url', i) as string;
        const width = this.getNodeParameter('width', i) as number;
        const height = this.getNodeParameter('height', i) as number;
        const duration = this.getNodeParameter('duration', i) as number;
        const frameRate = this.getNodeParameter('frameRate', i) as number;
        const outputFileName = this.getNodeParameter('outputFileName', i) as string;

        this.logger.debug(
          `Parameters: URL=${url}, dimensions=${width}x${height}, duration=${duration}s, frameRate=${frameRate}, output=${outputFileName}`
        );

        this.logger.info('Launching browser');
        const browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        this.logger.debug('Creating new page');
        const page = await browser.newPage();
        await page.setViewport({ width, height });

        this.logger.info('Initializing recorder');
        const recorder = new Recorder(page, {
          fps: frameRate,
          videoFrame: { width, height },
        });

        const outputPath = path.join('/tmp', outputFileName);
        this.logger.debug(`Output path: ${outputPath}`);

        this.logger.info('Starting recording');
        await recorder.start(outputPath);

        this.logger.debug(`Navigating to URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        this.logger.info(`Recording for ${duration} seconds`);
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            this.logger.debug('Recording duration completed');
            resolve(true);
            clearTimeout(timeout);
          }, duration * 1000);
        });

        this.logger.info('Stopping recording');
        await recorder.stop();

        this.logger.debug('Closing browser');
        await browser.close();

        this.logger.info('Reading recorded file');
        const videoData = fs.readFileSync(outputPath);
        const binaryData = await this.helpers.prepareBinaryData(videoData, outputFileName);

        returnData.push({
          json: {},
          binary: {
            data: binaryData,
          },
        });

        this.logger.debug(`Successfully processed item ${i + 1}`);

      } catch (error) {
        this.logger.error(`Error processing item ${i + 1}: ${error.message}`);
        throw error;
      }
    }

    const duration = Date.now() - startTime;
    this.logger.info(`PuppeteerScreenRecorder execution completed in ${duration}ms`);

    return this.prepareOutputData(returnData);
  }
}
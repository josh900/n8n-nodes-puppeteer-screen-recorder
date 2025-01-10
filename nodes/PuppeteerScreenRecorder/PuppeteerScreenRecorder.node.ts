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
    inputs: ['main'] as unknown as NodeConnectionType[],
    outputs: ['main'] as unknown as NodeConnectionType[],
    properties: [
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        default: 'video',
        options: [
          { name: 'Video Recording', value: 'video' },
          { name: 'Screenshot', value: 'screenshot' }
        ],
        description: 'Whether to record a video or take a screenshot.',
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'https://example.com',
        description: 'The URL of the website to record/capture.',
      },
      {
        displayName: 'Width',
        name: 'width',
        type: 'number',
        default: 1280,
        description: 'The width of the viewport.',
      },
      {
        displayName: 'Height', 
        name: 'height',
        type: 'number',
        default: 720,
        description: 'The height of the viewport.',
      },
      {
        displayName: 'Duration',
        name: 'duration',
        type: 'number',
        displayOptions: {
          show: {
            mode: ['video']
          }
        },
        default: 5,
        description: 'The duration of the recording in seconds.',
      },
      {
        displayName: 'Frame Rate',
        name: 'frameRate',
        type: 'number',
        displayOptions: {
          show: {
            mode: ['video']
          }
        },
        default: 25,
        description: 'The frame rate of the recording.',
      },
      {
        displayName: 'Image Format',
        name: 'imageFormat',
        type: 'options',
        displayOptions: {
          show: {
            mode: ['screenshot']
          }
        },
        options: [
          { name: 'PNG', value: 'png' },
          { name: 'JPEG', value: 'jpeg' },
          { name: 'WEBP', value: 'webp' }
        ],
        default: 'png',
        description: 'The format of the screenshot image.',
      },
      {
        displayName: 'Full Page',
        name: 'fullPage',
        type: 'boolean',
        displayOptions: {
          show: {
            mode: ['screenshot']
          }
        },
        default: false,
        description: 'Whether to take a screenshot of the full scrollable page.',
      },
      {
        displayName: 'Output File Name',
        name: 'outputFileName',
        type: 'string',
        default: '',
        description: 'The name of the output file. If empty, will use timestamp.',
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
        description: 'The format of the output video file.',
      },
      {
        displayName: 'Video Quality',
        name: 'videoQuality',
        type: 'number',
        default: 80,
        description: 'The quality of the video (1-100).',
      },
      {
        displayName: 'Follow New Tabs',
        name: 'followNewTab',
        type: 'boolean',
        default: true,
        description: 'Whether to follow and record new tabs opened during recording.',
      },
      {
        displayName: 'Initial Delay',
        name: 'initialDelay',
        type: 'number',
        default: 0,
        description: 'Time to wait in seconds before starting the capture or recording',
      },
      {
        displayName: 'Scale',
        name: 'scale',
        type: 'string',
        default: '100%',
        description: 'Scale factor for the browser (e.g. 100%, 125%, 75% or 1, 1.25, 0.75)',
        placeholder: '100%',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      let browser: Browser | null = null;
      let recorder: Recorder | null = null;
      const mode = this.getNodeParameter('mode', i) as string;

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
        const initialDelay = this.getNodeParameter('initialDelay', i) as number;

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
        
        // Set a reasonable timeout and wait only for DOM content
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000  // 10 second timeout
        });

        await page.setViewport({ width, height });

        // Apply scaling if specified
        const scaleInput = this.getNodeParameter('scale', i) as string;
        
        // Convert scale input to decimal
        let scaleFactor = 1;
        if (scaleInput.endsWith('%')) {
          scaleFactor = parseInt(scaleInput.replace('%', ''), 10) / 100;
        } else {
          scaleFactor = parseFloat(scaleInput);
        }

        // Validate scale factor
        if (isNaN(scaleFactor) || scaleFactor <= 0) {
          throw new NodeOperationError(this.getNode(), 'Invalid scale factor');
        }

        // Set initial viewport size
        await page.setViewport({
          width,
          height,
        });

        // Apply scaling using CSS transform
        await page.evaluate(async (scale) => {
          // Add a wrapper div around the body content
          const wrapper = document.createElement('div');
          wrapper.id = 'puppeteer-wrapper';
          // Move all body children to wrapper
          while (document.body.firstChild) {
            wrapper.appendChild(document.body.firstChild);
          }
          document.body.appendChild(wrapper);

          // Style the body and wrapper
          document.body.style.margin = '0';
          document.body.style.padding = '0';
          document.body.style.overflow = 'hidden';
          
          wrapper.style.position = 'absolute';
          wrapper.style.transformOrigin = 'top left';
          wrapper.style.transform = `scale(${scale})`;
          wrapper.style.width = `${100/scale}%`;
          wrapper.style.height = `${100/scale}%`;
        }, scaleFactor);

        // Wait for any animations/transitions to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // User-specified initial delay before recording
        if (initialDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, initialDelay * 1000));
        }

        if (mode === 'video') {
          // Video recording logic
          const duration = this.getNodeParameter('duration', i) as number;
          const frameRate = this.getNodeParameter('frameRate', i) as number;
          const videoFormat = this.getNodeParameter('videoFormat', i) as string;
          
          let outputFileName = this.getNodeParameter('outputFileName', i) as string;
          if (!outputFileName) {
            outputFileName = `recording-${Date.now()}.${videoFormat}`;
          } else if (!outputFileName.endsWith(`.${videoFormat}`)) {
            outputFileName = `${outputFileName}.${videoFormat}`;
          }

          recorder = new Recorder(page, {
            fps: frameRate,
            followNewTab: true,
            videoFrame: {
              width,
              height,
            },
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
          await new Promise((resolve) => setTimeout(resolve, duration * 1000));
          await recorder.stop();
          
          const videoData = fs.readFileSync(outputPath);
          const binaryData = await this.helpers.prepareBinaryData(videoData, outputFileName);

          returnData.push({
            json: {
              success: true,
              mode: 'video',
              file: outputFileName,
              format: videoFormat,
              duration,
              width,
              height,
              frameRate,
              initialDelay,
              scale: scaleInput,
              url
            },
            binary: {
              data: binaryData,
            },
          });

        } else {
          // Screenshot logic
          const imageFormat = this.getNodeParameter('imageFormat', i) as string;
          const fullPage = this.getNodeParameter('fullPage', i) as boolean;
          
          let outputFileName = this.getNodeParameter('outputFileName', i) as string;
          if (!outputFileName) {
            outputFileName = `screenshot-${Date.now()}.${imageFormat}`;
          } else if (!outputFileName.endsWith(`.${imageFormat}`)) {
            outputFileName = `${outputFileName}.${imageFormat}`;
          }

          const screenshotOptions = {
            type: imageFormat as 'png' | 'jpeg' | 'webp',
            fullPage,
            quality: imageFormat === 'jpeg' ? 80 : undefined,
          };

          const screenshotBuffer = await page.screenshot(screenshotOptions);
          const binaryData = await this.helpers.prepareBinaryData(screenshotBuffer, outputFileName);

          returnData.push({
            json: {
              success: true,
              mode: 'screenshot',
              file: outputFileName,
              format: imageFormat,
              width,
              height,
              fullPage,
              scale: scaleInput,
              url
            },
            binary: {
              data: binaryData,
            },
          });
        }

        await browser.close();
        browser = null;

      } catch (error) {
        await cleanup();
        throw new NodeOperationError(
          this.getNode(),
          `Operation failed: ${(error as Error).message}`,
          { description: `Error occurred while ${mode === 'video' ? 'recording' : 'capturing'} website` }
        );
      }
    }

    return this.prepareOutputData(returnData);
  }
}

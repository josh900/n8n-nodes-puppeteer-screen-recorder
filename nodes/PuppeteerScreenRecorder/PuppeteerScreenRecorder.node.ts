import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import puppeteer from 'puppeteer';

export class PuppeteerScreenRecorder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Puppeteer Screen Recorder',
    name: 'puppeteerScreenRecorder',
    icon: 'file:puppeteer.svg',
    group: ['transform'],
    version: 1,
    description: 'Record screen using Puppeteer',
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
        description: 'URL of website to record',
      },
      {
        displayName: 'Recording Resolution',
        name: 'resolution',
        type: 'options',
        default: '1280x720',
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
        required: true,
        description: 'Resolution of the recording',
      },
      {
        displayName: 'Recording Duration',
        name: 'duration',
        type: 'number',
        default: 5,
        required: true,
        description: 'Duration of recording in seconds',
      },
      {
        displayName: 'Output File Name',
        name: 'fileName',
        type: 'string',
        default: 'recording.webm',
        required: true,
        description: 'File name to save the recording',
      },
      {
        displayName: 'Binary Property',
        name: 'binaryProperty',
        type: 'string',
        default: 'data',
        required: true,
        description: 'Name of the binary property to which to write the recording data',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const url = this.getNodeParameter('url', itemIndex, '') as string;
      const resolution = this.getNodeParameter('resolution', itemIndex, '1280x720') as string;
      const duration = this.getNodeParameter('duration', itemIndex, 5) as number;
      const fileName = this.getNodeParameter('fileName', itemIndex, 'recording.webm') as string;
      const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;

      const [width, height] = resolution.split('x').map(Number);

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--window-size=1920,1080'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width, height });

      await page.goto(url, { waitUntil: 'networkidle0' });

      const recordingBlob = await page.evaluate(async (duration) => {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: false,
        });
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e: any) => chunks.push(e.data);
        recorder.start();
        await new Promise((resolve) => setTimeout(resolve, duration * 1000));
        recorder.stop();
        await new Promise((resolve) => recorder.onstop = resolve);
        return new Blob(chunks, { type: 'video/webm' });
      }, duration);

      const recordingBuffer = await recordingBlob.arrayBuffer();

      await browser.close();

      const data = await this.helpers.prepareBinaryData(Buffer.from(recordingBuffer), fileName);

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
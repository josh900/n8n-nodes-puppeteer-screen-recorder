import { IExecuteFunctions } from 'n8n-core';

import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import puppeteer from 'puppeteer';

import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';



export class PuppeteerScreenRecorderNode implements INodeType {

  description: INodeTypeDescription = {

    displayName: 'Puppeteer Screen Recorder',

    name: 'puppeteerScreenRecorder',

    icon: 'file:puppeteer.svg',

    group: ['transform'],

    version: 1,

    subtitle: '={{$parameter["operation"]}}',

    description: 'Record screen using Puppeteer',

    defaults: {

      name: 'Puppeteer Screen Recorder',

      color: '#772244',

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

        displayName: 'Duration (seconds)',

        name: 'duration',

        type: 'number',

        default: 10,

        required: true,

        description: 'Duration of the recording in seconds',

      },

      {

        displayName: 'Output File Name',

        name: 'fileName',

        type: 'string',

        default: 'recording.mp4',

        required: true,

        description: 'The name of the output video file',

      },

      {

        displayName: 'Resolution',

        name: 'resolution',

        type: 'options',

        options: [

          { name: '720p', value: '1280x720' },

          { name: '1080p', value: '1920x1080' },

          { name: '4K', value: '3840x2160' },

        ],

        default: '1280x720',

        description: 'The resolution of the video recording',

      },

    ],

  };



  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

    const items = this.getInputData();

    const returnData: INodeExecutionData[] = [];



    for (let i = 0; i < items.length; i++) {

      const url = this.getNodeParameter('url', i) as string;

      const duration = this.getNodeParameter('duration', i) as number;

      const fileName = this.getNodeParameter('fileName', i) as string;

      const resolution = this.getNodeParameter('resolution', i) as string;



      const [width, height] = resolution.split('x').map(Number);



      const browser = await puppeteer.launch({

        args: ['--no-sandbox', '--disable-setuid-sandbox'],

      });

      const page = await browser.newPage();

      await page.setViewport({ width, height });

      await page.goto(url);



      const recorder = new PuppeteerScreenRecorder(page);

      await recorder.start(fileName);



      await new Promise((resolve) => setTimeout(resolve, duration * 1000));



      await recorder.stop();

      await browser.close();



      returnData.push({

        json: {},

        binary: {

          data: await this.helpers.prepareBinaryData(Buffer.from(fileName), fileName),

        },

      });

    }



    return [returnData];

  }

}


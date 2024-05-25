import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { PuppeteerScreenRecorder as ScreenRecorder } from 'puppeteer-screen-recorder';
import puppeteer, { Browser, Page } from 'puppeteer';

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
                default: 'recording.mp4',
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

        let browser: Browser;
        let page: Page;

        try {
            browser = await puppeteer.launch();
            page = await browser.newPage();

            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                const url = this.getNodeParameter('url', itemIndex, '') as string;
                const duration = this.getNodeParameter('duration', itemIndex, 5) as number;
                const fileName = this.getNodeParameter('fileName', itemIndex, 'recording.mp4') as string;
                const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;

                const recorder = new ScreenRecorder(page);

                await recorder.start(fileName);

                await page.goto(url, { waitUntil: 'networkidle0' });
                await new Promise((resolve) => setTimeout(resolve, duration * 1000));

                await recorder.stop();

                const recordingBuffer = await recorder.getRecording();
                const data = await this.helpers.prepareBinaryData(recordingBuffer, fileName);

                returnData.push({
                    json: {},
                    binary: {
                        [binaryProperty]: data,
                    },
                });
            }
        } catch (error) {
            if (this.continueOnFail()) {
                returnData.push({
                    json: {
                        error: error.message,
                    },
                });
            } else {
                throw error;
            }
        } finally {
            if (browser) {
                await browser.close();
            }
        }

        return this.prepareOutputData(returnData);
    }
}
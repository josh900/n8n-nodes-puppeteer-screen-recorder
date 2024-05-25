import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import puppeteer, { Browser, Page } from 'puppeteer';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';

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

        let browser: Browser | undefined;
        let page: Page | undefined;

        try {
            browser = await puppeteer.launch();
            page = await browser.newPage();

            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                const url = this.getNodeParameter('url', itemIndex, '') as string;
                const duration = this.getNodeParameter('duration', itemIndex, 5) as number;
                const fileName = this.getNodeParameter('fileName', itemIndex, 'recording.webm') as string;
                const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;

                await page.goto(url, { waitUntil: 'networkidle0' });

                const outputDir = `/tmp/recordings/${itemIndex}`;
                const recordingPath = join(outputDir, 'recording.webm');

                await page.evaluate(async (outputFile) => {
                    const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
                    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                    const chunks: Blob[] = [];
                    recorder.ondataavailable = (event) => chunks.push(event.data);
                    recorder.start();
                    (globalThis as any).recorderStop = () => {
                        recorder.stop();
                        return new Promise<void>((resolve) => {
                            recorder.onstop = () => {
                                const blob = new Blob(chunks, { type: 'video/webm' });
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const buffer = Buffer.from(reader.result as ArrayBuffer);
                                    (globalThis as any).require('fs').writeFileSync(outputFile, buffer);
                                    resolve();
                                };
                                reader.readAsArrayBuffer(blob);
                            };
                        });
                    };
                }, recordingPath);

                await new Promise((resolve) => setTimeout(resolve, duration * 1000));
                await page.evaluate(() => (globalThis as any).recorderStop());

                const recordingBuffer = await readFile(recordingPath);
                const data = await this.helpers.prepareBinaryData(recordingBuffer, fileName);

                returnData.push({
                    json: {},
                    binary: {
                        [binaryProperty]: data,
                    },
                });

                await unlink(recordingPath);
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
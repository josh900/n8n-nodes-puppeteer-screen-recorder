import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import puppeteer from 'puppeteer';

export class PuppeteerScreenRecorder implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Puppeteer Screen Recorder',
		name: 'puppeteerScreenRecorder',
		icon: 'file:puppeteer.svg',
		group: ['transform'],
		version: 1,
		description: 'Record a website screen using Puppeteer',
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
				required: true,
				default: '',
				placeholder: 'https://example.com',
				description: 'The URL of the website to record',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				required: true,
				default: 5,
				description: 'The recording duration in seconds',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 1280,
				description: 'The width of the recording resolution',
			},
			{
				displayName: 'Height',  
				name: 'height',
				type: 'number',
				default: 720,
				description: 'The height of the recording resolution',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: 'recording.webm',
				description: 'The file name to save the recording as',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const url = this.getNodeParameter('url', i) as string;
			const duration = this.getNodeParameter('duration', i) as number;
			const width = this.getNodeParameter('width', i) as number;
			const height = this.getNodeParameter('height', i) as number;
			const fileName = this.getNodeParameter('fileName', i) as string;

			const browser = await puppeteer.launch();  
			const page = await browser.newPage();
			await page.setViewport({ width, height });

			const recorder = new PuppeteerScreenRecorder(page);

			await recorder.start(fileName);  
			await page.goto(url, { waitUntil: 'networkidle0' }); 
			await new Promise(resolve => setTimeout(resolve, duration * 1000));
			await recorder.stop();

			const videoBuffer = await recorder.getRecording();

			await browser.close();

			const data = await this.helpers.prepareBinaryData(videoBuffer, fileName);

			returnData.push({
				json: {},
				binary: {
					data,
				},
			});
		}

		return this.prepareOutputData(returnData);
	}
}
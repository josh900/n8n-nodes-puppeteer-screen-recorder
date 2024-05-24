import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';

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

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const url = this.getNodeParameter('url', itemIndex, '') as string;
			const resolution = this.getNodeParameter('resolution', itemIndex, '1280x720') as string;
			const duration = this.getNodeParameter('duration', itemIndex, 5) as number;
			const fileName = this.getNodeParameter('fileName', itemIndex, 'recording.mp4') as string;
			const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;

			const [width, height] = resolution.split('x').map(Number);

			const recorder = new PuppeteerScreenRecorder();

			await recorder.launch({
				headless: true,
				defaultViewport: {width, height},
				args: ['--window-size=1920,1080'],
			});
			
			await recorder.startRecording(fileName);
			await recorder.goTo(url, {waitUntil: 'networkidle0'});

			await new Promise(resolve => setTimeout(resolve, duration * 1000)); 

			await recorder.stopRecording();
			const recordingBuffer = await recorder.getRecording();

			const data = await this.helpers.prepareBinaryData(recordingBuffer, fileName);

			returnData.push({
				json: {},
				binary: {
					[binaryProperty]: data,
				},
			});

			await recorder.close();
		}

		return this.prepareOutputData(returnData);
	}
}
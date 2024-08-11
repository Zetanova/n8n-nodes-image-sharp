import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';
import { imageSharpOperations } from './ImageSharpDescription';
import sharp, { FormatEnum, OutputInfo } from 'sharp';
import { optimizeDefaults } from './ImageSharpDefaults';
import path from "node:path";


// const configuredOutputs = (parameters: INodeParameters) => {
// 	//const formats = ((parameters.formats as IDataObject)?.values as IDataObject[]) ?? [];
// 	const formats = (parameters.formats as NodeParameterValue[]) ?? [];
// 	const outputs = formats.map((format, index) => {
// 		return <INodeOutputConfiguration>{
// 			type: `${NodeConnectionType.Main}`,
// 			displayName: format?.toLocaleString()
// 		};
// 	});

// 	return outputs
// }

export class ImageSharp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Image Sharp',
		name: 'imageSharp',
		icon: "file:imagesharp.svg",
		group: ['transform'],
		version: 1,
		description: 'Process and optimize an image',
		defaults: {
			name: 'Image Sharp',
		},
		inputs: ['main'],
		//outputs: `={{(${configuredOutputs})($parameter)}}`,
		outputs: ['main'],
		properties: [
			...imageSharpOperations,
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				placeholder: '',
				required: true,
				description: 'The name of the input binary field containing the image',
			},
			{
				displayName: 'Output Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{
						name: 'Png',
						value: 'png',
					},
					{
						name: 'Jpeg',
						value: 'jpeg',
					},
					{
						name: 'Webp',
						value: 'webp',
					},
					{
						name: 'Avif',
						value: 'avif',
					}
				],
				default: ['png', 'jpeg'],
				required: true,
				description: 'The image output formats',
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData[][] = [];

		const items = this.getInputData();

		let item: INodeExecutionData;
		let binaryPropertyName: string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string
				item = items[itemIndex]

				if (!item.binary)
					throw new NodeOperationError(this.getNode(), `input data required`, { itemIndex })

				const inputData = item.binary[binaryPropertyName]

				if (inputData.fileType && inputData.fileType !== 'image')
					throw new NodeOperationError(this.getNode(), `unsupported file type: ${inputData.fileType}`, { itemIndex })

				const input = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName)

				const formats = this.getNodeParameter('formats', itemIndex) as string[]

				if (itemIndex === 0) {
					const nodeOutputs = this.getNodeOutputs()
					returnData = new Array(nodeOutputs.length).fill(0).map(() => []);
				}

				const imageOutputs: Promise<{ format: string, data: Buffer; info: OutputInfo }>[] = []

				const imgSharp = sharp(input)

				for (const format of formats) {
					let pipe = imgSharp

					switch (<keyof FormatEnum>format) {
						case 'png':
							pipe = pipe.png(optimizeDefaults.png)
							break
						case 'jpeg':
							pipe = pipe.jpeg(optimizeDefaults.jpeg)
							break
						case 'webp':
							pipe = pipe.webp(optimizeDefaults.webp)
							break
						case 'avif':
							pipe = pipe.avif(optimizeDefaults.avif)
							break
						default:
							throw new NodeOperationError(this.getNode(), `unsupported image format '${format}'`, { itemIndex })
					}

					const r = pipe.toBuffer({ resolveWithObject: true })
						.then(n => { return { format, ...n } })

					imageOutputs.push(r)
				}


				for await (const imageOutput of imageOutputs) {

					//const outputIndex = formats.indexOf(imageOutput.format)
					const outputIndex = 0

					if (outputIndex < 0)
						throw new NodeOperationError(this.getNode(), `output format '${imageOutput.format}' unknown`, { itemIndex })

					let fileName = inputData.fileName
					let ext = inputData.fileExtension
					let mimeType = inputData.mimeType

					switch (<keyof FormatEnum>imageOutput.format) {
						case 'png':
							mimeType = 'image/png'
							ext = 'png'
							break
						case 'jpeg':
							mimeType = 'image/jpeg'
							ext = 'jpg'
							break
						case 'webp':
							mimeType = 'image/webp'
							ext = 'webp'
							break
						case 'avif':
							mimeType = 'image/avif'
							ext = 'avif'
							break
					}

					if (fileName) {
						const name = path.basename(fileName, path.extname(fileName))
						fileName = `${name}.min.${ext}`
					}

					const binary = await this.helpers.prepareBinaryData(imageOutput.data, fileName, mimeType)

					returnData[outputIndex].push({
						pairedItem: { item: itemIndex },
						json: { ...imageOutput.info },
						binary: {
							[binaryPropertyName]: binary
						}
					});
				}

			} catch (error) {
				console.error(error)

				if (this.continueOnFail()) {
					returnData[0].push({ pairedItem: itemIndex, json: { error: error.message } });
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		//return this.prepareOutputData(items);

		return returnData
	}
}

import { INodeProperties } from 'n8n-workflow';


const optimizeOperation: INodeProperties[] = [
	{
		displayName: 'Max File Size',
		name: 'maxFileSize',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['optimize'],
			},
		},
		default: undefined,
		description: 'Max file size in bytes'
	}
];


export const imageSharpOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'OPTIMIZE',
				value: 'optimize',
				description: 'Optimize and limit an image size',
				action: 'optimize a image',
			}
		],
		default: 'optimize',
	},
  ...optimizeOperation,
];

import { AvifOptions, JpegOptions, PngOptions, WebpOptions } from "sharp"

export interface SharpOutputOptions {
		png?: PngOptions,
		jpeg?: JpegOptions,
		webp?: WebpOptions,
		avif?: AvifOptions
}

export const optimizeDefaults:SharpOutputOptions = {
	png: {
		compressionLevel: 8,
		palette: true,
		effort: 8,
		quality: 90
	},
	jpeg: {
		mozjpeg: true,
		//quality: 80
	},
	webp: {
		//nearLossless: true,
		//quality: 80
	},
	avif: {
		//effort: 4,
		//lossless: false,
		//quality: 50,
	}
}

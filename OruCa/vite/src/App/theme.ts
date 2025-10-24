import { createSystem, defaultConfig } from '@chakra-ui/react';
import '@fontsource/biz-udpgothic/400.css';

export const customSystem = createSystem(defaultConfig, {
  theme: {
	tokens: {
	  colors:{
		default:{value:"rgb(30, 14, 81)"},
		none: { value:"rgb(122, 122, 122)"}
	  },
	  fonts: {
		heading: { value: "'BIZ UDPGothic',system-ui" },
		body: { value: "'BIZ UDPGothic',system-ui" },
	  },
	},
  },
  
});


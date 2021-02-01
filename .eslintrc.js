module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true,
		node: true
	},
	extends: [
		'standard'
	],
	parserOptions: {
		ecmaVersion: 12
	},
	rules: {
		indent: ['error', 'tab', { SwitchCase: 1 }],
		'keyword-spacing': ['error', {
			overrides: {
				catch: { after: false },
				for: { after: false },
				switch: { after: false }
			}
		}],
		'no-tabs': ['error', { allowIndentationTabs: true }],
		semi: ['error', 'always'],
		'space-before-function-paren': ['error', 'never']
	}
};

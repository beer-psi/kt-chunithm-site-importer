import terser from '@rollup/plugin-terser';

export default {
  input: 'kt-chunithm-site-importer.user.js',
  output: {
    file: 'kt-chunithm-site-importer.min.js',
    format: 'iife'
  },
  plugins: [terser()]
};

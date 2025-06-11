const icongen = require('electron-icon-maker');

icongen({
  input: './build/icons/icon.png',
  output: './build/icons',
  flatten: true
})
.then(() => {
  console.log('Platform icons generated successfully');
})
.catch(err => {
  console.error('Error generating platform icons:', err);
});
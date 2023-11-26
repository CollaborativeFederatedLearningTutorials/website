const tutorialElement = document.querySelector('#tutorial');

const containerElement = document.createElement('div');
containerElement.classList.add('side-container');

const imageElement = document.createElement('img');
imageElement.src = '';
imageElement.alt = '';

imageElement.setAttribute('class', 'tutorial-image');
imageElement.setAttribute('id', 'tutorial-image-1');

containerElement.appendChild(imageElement);

tutorialElement.appendChild(containerElement);

const sideContainer = document.querySelector('.side-container');

const image = sideContainer.querySelector('img');

const imageSources = [        // CONTENTS IN TUTORIAL
  { start: 4180, image: 1 },  // Inference Setup with MedPerf (Benchmark Owner)
  { start: 4330, image: 2 },  // Register a reference model
  { start: 4485, image: 3 },  // Register the metrics MLCube
  { start: 4728, image: 4 },  // Register the benchmark
  { start: 5020, image: 1 },  // Participate as a model owner (Model Owner)
  { start: 5155, image: 5 },  // Register your model
  { start: 5352, image: 6 },  // Request participation in the benchmark
  { start: 5490, image: 1 },  // Participate as a data owner (Inference data Owner)
  { start: 5626, image: 7 },  // Process data using the data prep mlcube
  { start: 5760, image: 8 },  // Register the dataset
  { start: 5995, image: 9 },  // Request participation
  { start: 6136, image: 10 }, // Accepting Inference Participation (Benchmark Owner)
  { start: 6290, image: 11 }, // Accept inference participation requests (from the model owners and data owners)
  { start: 6440, image: 12 }, // Run Inference (Inference Data Owner)
  { start: 6719, image: 13 }, // Submit inference results
  { start: 6880, image: 14 }, // Result collection (Benchmark Owner)
];

window.addEventListener('scroll', function() {
  const scrollPosition = window.scrollY;
  let imageSrc = '';
  imageSources.forEach(({ start, image}) => {
    if (scrollPosition > start) {
      imageSrc = `https://raw.githubusercontent.com/gabrielraeder/website/main/docs/static/images/workflow/miccai-tutorial${image}.png`;
    }
  })
  image.src = imageSrc;
});

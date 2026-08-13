// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // Load State
  let cmsData = JSON.parse(JSON.stringify(HotelState.content || {}));

  // DOM Elements - Inputs
  const cmsHeroHeading = document.getElementById('cmsHeroHeading');
  const cmsHeroSubheading = document.getElementById('cmsHeroSubheading');
  const cmsHeroImage = document.getElementById('cmsHeroImage');
  const cmsHeroImageUpload = document.getElementById('cmsHeroImageUpload');
  const btnUploadHeroImage = document.getElementById('btnUploadHeroImage');

  const cmsAboutHeading = document.getElementById('cmsAboutHeading');
  const cmsAboutSubheading = document.getElementById('cmsAboutSubheading');
  const cmsAboutHistory = document.getElementById('cmsAboutHistory');

  const cmsFooterPhone = document.getElementById('cmsFooterPhone');
  const cmsFooterEmail = document.getElementById('cmsFooterEmail');
  const cmsFooterAddress = document.getElementById('cmsFooterAddress');

  const previewFrame = document.getElementById('livePreviewFrame');
  const btnPublish = document.getElementById('btnPublishCms');

  // Device Preview Buttons
  const btnDesktop = document.getElementById('btnPreviewDesktop');
  const btnTablet = document.getElementById('btnPreviewTablet');
  const btnMobile = document.getElementById('btnPreviewMobile');
  const iframeContainer = document.getElementById('iframeDeviceContainer');

  // Toast
  const statusToast = new bootstrap.Toast(document.getElementById('statusToast'));

  // Initialize form fields
  function populateForm() {
    if (cmsData.hero) {
      cmsHeroHeading.value = cmsData.hero.heading || '';
      cmsHeroSubheading.value = cmsData.hero.subheading || '';
      cmsHeroImage.value = cmsData.hero.image || '';
    }
    if (cmsData.about) {
      cmsAboutHeading.value = cmsData.about.heading || '';
      cmsAboutSubheading.value = cmsData.about.subheading || '';
      cmsAboutHistory.value = cmsData.about.history || '';
    }
    if (cmsData.footer) {
      cmsFooterPhone.value = cmsData.footer.phone || '';
      cmsFooterEmail.value = cmsData.footer.email || '';
      cmsFooterAddress.value = cmsData.footer.address || '';
    }
  }

  populateForm();

  // Handle updates
  function handleInput() {
    cmsData.hero = {
      ...cmsData.hero,
      heading: cmsHeroHeading.value,
      subheading: cmsHeroSubheading.value,
      image: cmsHeroImage.value
    };

    cmsData.about = {
      ...cmsData.about,
      heading: cmsAboutHeading.value,
      subheading: cmsAboutSubheading.value,
      history: cmsAboutHistory.value
    };

    cmsData.footer = {
      ...cmsData.footer,
      phone: cmsFooterPhone.value,
      email: cmsFooterEmail.value,
      address: cmsFooterAddress.value
    };

    // Send delta to iframe for real-time preview
    if (previewFrame.contentWindow) {
      previewFrame.contentWindow.postMessage({
        type: 'CMS_UPDATE',
        payload: cmsData
      }, '*');
    }
  }

  // Attach listeners
  const inputs = [
    cmsHeroHeading, cmsHeroSubheading, cmsHeroImage,
    cmsAboutHeading, cmsAboutSubheading, cmsAboutHistory,
    cmsFooterPhone, cmsFooterEmail, cmsFooterAddress
  ];
  inputs.forEach(input => {
    input.addEventListener('input', handleInput);
  });

  // Handle Image Upload
  if (btnUploadHeroImage && cmsHeroImageUpload) {
    btnUploadHeroImage.addEventListener('click', () => {
      cmsHeroImageUpload.click();
    });

    cmsHeroImageUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          cmsHeroImage.value = evt.target.result;
          handleInput();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Save to State
  btnPublish.addEventListener('click', () => {
    HotelState.content = cmsData;
    statusToast.show();
  });

  // Device Toggle
  function setDevice(mode, activeBtn) {
    [btnDesktop, btnTablet, btnMobile].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
    iframeContainer.className = `iframe-device-${mode}`;
  }

  btnDesktop.addEventListener('click', () => setDevice('desktop', btnDesktop));
  btnTablet.addEventListener('click', () => setDevice('tablet', btnTablet));
  btnMobile.addEventListener('click', () => setDevice('mobile', btnMobile));
});

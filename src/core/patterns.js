import THREE from '../utils/three';

const patterns = {
    default:[
        new THREE.Vector3(200.00, 60.00, 0.00),
        new THREE.Vector3(198.36, 52.28, 50.73),
        new THREE.Vector3(193.46, 31.10, 98.14),
        new THREE.Vector3(185.38, 1.92, 139.14),
        new THREE.Vector3(174.26, -27.75, 171.03),
        new THREE.Vector3(160.28, -50.29, 191.73),
        new THREE.Vector3(143.67, -59.88, 199.90),
        new THREE.Vector3(124.70, -54.06, 194.99),
        new THREE.Vector3(103.68, -34.33, 177.32),
        new THREE.Vector3(80.96, -5.76, 148.06),
        new THREE.Vector3(56.91, 24.29, 109.11),
        new THREE.Vector3(31.92, 48.08, 63.02),
        new THREE.Vector3(6.41, 59.51, 12.81),
        new THREE.Vector3(-19.20, 55.62, -38.23),
        new THREE.Vector3(-44.50, 37.41, -86.78),
        new THREE.Vector3(-69.07, 9.58, -129.65),
        new THREE.Vector3(-92.51, -20.72, -164.03),
        new THREE.Vector3(-114.42, -45.69, -187.69),
        new THREE.Vector3(-134.46, -58.89, -199.08),
        new THREE.Vector3(-152.29, -56.94, -197.44),
        new THREE.Vector3(-167.62, -40.34, -182.88),
        new THREE.Vector3(-180.19, -13.35, -156.37),
        new THREE.Vector3(-189.81, 17.07, -119.62),
        new THREE.Vector3(-196.31, 43.10, -75.05),
        new THREE.Vector3(-199.59, 58.04, -25.58),
        new THREE.Vector3(-199.59, 58.04, 25.58),
        new THREE.Vector3(-196.31, 43.10, 75.05),
        new THREE.Vector3(-189.81, 17.07, 119.62),
        new THREE.Vector3(-180.19, -13.35, 156.37),
        new THREE.Vector3(-167.62, -40.34, 182.88),
        new THREE.Vector3(-152.29, -56.94, 197.44),
        new THREE.Vector3(-134.46, -58.89, 199.08),
        new THREE.Vector3(-114.42, -45.69, 187.69),
        new THREE.Vector3(-92.51, -20.72, 164.03),
        new THREE.Vector3(-69.07, 9.58, 129.65),
        new THREE.Vector3(-44.50, 37.41, 86.78),
        new THREE.Vector3(-19.20, 55.62, 38.23),
        new THREE.Vector3(6.41, 59.51, -12.81),
        new THREE.Vector3(31.92, 48.08, -63.02),
        new THREE.Vector3(56.91, 24.29, -109.11),
        new THREE.Vector3(80.96, -5.76, -148.06),
        new THREE.Vector3(103.68, -34.33, -177.32),
        new THREE.Vector3(124.70, -54.06, -194.99),
        new THREE.Vector3(143.67, -59.88, -199.90),
        new THREE.Vector3(160.28, -50.29, -191.73),
        new THREE.Vector3(174.26, -27.75, -171.03),
        new THREE.Vector3(185.38, 1.92, -139.14),
        new THREE.Vector3(193.46, 31.10, -98.14),
        new THREE.Vector3(198.36, 52.28, -50.73),
        new THREE.Vector3(200.00, 60.00, -0.00)

    ],
    circle: [
        new THREE.Vector3(-483.80, -100.01, 7.31),
        new THREE.Vector3(-315.40, -99.82, -232.11),
        new THREE.Vector3(-84.72, -99.80, -251.11),
        new THREE.Vector3(70.16, -99.89, -139.31),
        new THREE.Vector3(92.26, -99.99, -13.52),
        new THREE.Vector3(76.89, -100.11, 134.40),
        new THREE.Vector3(9.13, -100.17, 208.38),
        new THREE.Vector3(-67.99, -100.21, 266.30),
        new THREE.Vector3(-210.05, -100.27, 337.50),
        new THREE.Vector3(-308.25, -100.26, 328.41),
        new THREE.Vector3(-432.92, -100.21, 266.07),
        new THREE.Vector3(-475.27, -94.88, 7.23),   
    ],
    spiral: [
        new THREE.Vector3(-70.78, -99.98, -23.08),
        new THREE.Vector3(-96.73, -99.89, -139.43),
        new THREE.Vector3(-185.25, -99.83, -207.79),
        new THREE.Vector3(-285.54, -99.83, -219.07),
        new THREE.Vector3(-368.16, -99.87, -160.86),
        new THREE.Vector3(-398.58, -99.96, -50.98),
        new THREE.Vector3(-371.52, -100.06, 72.03),
        new THREE.Vector3(-252.03, -100.11, 134.45),
        new THREE.Vector3(-110.84, -100.11, 138.00),
        new THREE.Vector3(0.38, -100.09, 107.75),
        new THREE.Vector3(68.32, -100.02, 29.01),
        new THREE.Vector3(119.32, -99.93, -87.01),
        new THREE.Vector3(122.82, -99.83, -211.41),
        new THREE.Vector3(74.93, -99.78, -271.67),
        new THREE.Vector3(-73.91, -99.70, -375.67),
        new THREE.Vector3(-289.66, -99.65, -441.56),
        new THREE.Vector3(-468.80, -99.66, -425.49),
        new THREE.Vector3(-587.10, -99.75, -315.81),
        new THREE.Vector3(-639.45, -99.89, -136.70),
        new THREE.Vector3(-625.40, -100.05, 65.26),
        new THREE.Vector3(-536.12, -100.15, 188.76),
        new THREE.Vector3(-343.74, -100.19, 243.57),
        new THREE.Vector3(-155.41, -100.20, 249.17),
        new THREE.Vector3(-54.42, -100.19, 234.10),
        new THREE.Vector3(102.62, -100.14, 181.18),
        new THREE.Vector3(177.10, -100.09, 108.40),
        new THREE.Vector3(226.73, -100.00, -4.60),
        new THREE.Vector3(231.90, -99.88, -144.82),
        new THREE.Vector3(118.56, -99.75, -310.21),
        new THREE.Vector3(-46.43, -99.67, -411.18),
        new THREE.Vector3(-349.21, -99.62, -480.70),
        new THREE.Vector3(-465.47, -99.78, -282.30),
        new THREE.Vector3(-469.19, -99.96, -49.60),
        new THREE.Vector3(-274.37, -100.06, 72.25),
        new THREE.Vector3(-98.02, -100.05, 61.59),
        new THREE.Vector3(-61.58, -96.74, -22.03),        
    ],
    penis: [
        new THREE.Vector3(-92.09, -99.82, -228.18),
        new THREE.Vector3(-42.26, -99.86, -177.48),
        new THREE.Vector3(34.28, -99.88, -155.75),
        new THREE.Vector3(105.43, -99.86, -176.13),
        new THREE.Vector3(131.36, -99.80, -248.86),
        new THREE.Vector3(102.85, -99.75, -317.58),
        new THREE.Vector3(48.80, -99.72, -355.50),
        new THREE.Vector3(-29.37, -99.70, -375.31),
        new THREE.Vector3(-86.32, -99.73, -343.43),
        new THREE.Vector3(-112.90, -99.77, -287.45),
        new THREE.Vector3(-85.21, -92.84, -226.85),
        new THREE.Vector3(-41.51, -90.45, -174.37),
        new THREE.Vector3(39.44, -92.07, -152.58),
        new THREE.Vector3(114.13, -99.93, -91.95),
        new THREE.Vector3(146.35, -99.98, -21.43),
        new THREE.Vector3(100.02, -100.06, 69.57),
        new THREE.Vector3(37.06, -100.06, 80.78),
        new THREE.Vector3(-38.12, -100.04, 51.62),
        new THREE.Vector3(-66.33, -99.96, -45.60),
        new THREE.Vector3(-22.18, -99.93, -93.30),
        new THREE.Vector3(46.14, -84.82, -151.74),
        new THREE.Vector3(-33.50, -86.93, -178.87),
        new THREE.Vector3(-78.87, -86.49, -230.89),
        new THREE.Vector3(-240.72, -99.80, -256.04),
        new THREE.Vector3(-369.63, -99.78, -270.70),
        new THREE.Vector3(-530.01, -99.76, -298.24),
        new THREE.Vector3(-629.02, -99.75, -311.51),
        new THREE.Vector3(-729.24, -99.80, -252.11),
        new THREE.Vector3(-772.52, -99.85, -187.87),
        new THREE.Vector3(-763.36, -99.89, -134.55),
        new THREE.Vector3(-666.58, -99.94, -77.30),
        new THREE.Vector3(-591.32, -99.95, -58.44),
        new THREE.Vector3(-502.87, -99.96, -50.44),
        new THREE.Vector3(-418.24, -99.96, -47.26),
        new THREE.Vector3(-320.82, -99.97, -41.85),
        new THREE.Vector3(-242.26, -99.97, -37.17),
        new THREE.Vector3(-167.64, -99.97, -35.59),
        new THREE.Vector3(-79.73, -99.97, -42.49),
    ],
    bounce: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-38.471288714594266, 38.471288714594266, -3.3205917249199564),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(55.08799557723546, -55.08799557723546, 0.25543013268615056),
    ],
    still: [
        new THREE.Vector3(-300, -25, 0),
    ],
    zoom: [
        new THREE.Vector3(-200, 50, 0),
    ],
    zoomBounce: [
        new THREE.Vector3(-200, -20, 0),
        new THREE.Vector3(-200, 50, 0),
        new THREE.Vector3(-200, 180, 0),
    ],
};

module.exports = patterns; // Export the patterns object
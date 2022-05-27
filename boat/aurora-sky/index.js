
/*
Tweaked version of https://github.com/webaverse/aurora-sky to make ribbons blending better
*/


import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame} = metaversefile;

export default () => {
  const app = useApp();
  {
    const vertexShader = `
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
    varying vec2 vUv;
    varying vec3 vPos;
    uniform float iTime;

    void main() {
        vPos=position;
        vUv = uv;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;

        gl_Position = projectedPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
    `;
    const fragmentShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    #include <common>
    
    uniform vec3 iResolution;
    uniform float iTime;
    varying vec2 vUv;
    varying vec3 vPos;

    #define time iTime

    mat2 mm2(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
    mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);
    float tri(in float x){return clamp(abs(fract(x)-.5),0.01,0.49);}
    vec2 tri2(in vec2 p){return vec2(tri(p.x)+tri(p.y),tri(p.y+tri(p.x)));}

    float triNoise2d(in vec2 p, float spd)
    {
        float z=1.8;
        float z2=2.5;
        float rz = 0.;
        p *= mm2(p.x*0.06);
        vec2 bp = p;
        for (float i=0.; i<5.; i++ )
        {
            vec2 dg = tri2(bp*1.85)*.75;
            dg *= mm2(time*spd);
            p -= dg/z2;

            bp *= 1.3;
            z2 *= .45;
            z *= .42;
            p *= 1.21 + (rz-1.0)*.02;
            
            rz += tri(p.x+tri(p.y))*z;
            p*= -m2;
        }
        return clamp(1./pow(rz*29., 1.3),0.,.55);
    }

    float hash21(in vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
    vec4 aurora(vec3 ro, vec3 rd)
    {
        vec4 col = vec4(0);
        vec4 avgCol = vec4(0);
        
        for(float i=0.;i<10.;i++)
        {
            float of = 0.006*hash21(gl_FragCoord.xy)*smoothstep(0.,15., i);
            float pt = ((.8+pow(i,1.4)*.002)-ro.y)/(rd.y*2.+0.4);
            pt -= of;
            vec3 bpos = ro + pt*rd;
            vec2 p = bpos.zx;
            float rzt = triNoise2d(p, 0.06);
            vec4 col2 = vec4(0,0,0, rzt);
            col2.rgb = (sin(1.-vec3(2.15,-.5, 1.2)+i*0.043)*0.5+0.5)*rzt;
            avgCol =  mix(avgCol, col2, .5);
            col += avgCol*exp2(-i*0.065 - 2.5)*smoothstep(0.,5., i);
            
        }
        
        col *= (clamp(rd.y*15.+.4,0.,1.));
        
        return col*1.8;
        
    }
    
    float rand1(float co) { return fract(sin(co*(91.3458)) * 47453.5453); }
    float rand2(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
    float rand(vec3 co){ return rand2(co.xy+rand1(co.z)); }

    //-------------------Background and Stars--------------------





    
    
    #define S(x,y,z) smoothstep(x,y,z)
    #define B(x,y,z,b) S(x, x+b, z)*S(y+b, y, z)
    //#define saturate(x) clamp(x,0.,1.)

    #define MOD3 vec3(.1031,.11369,.13787)

    #define MOONPOS vec2(1.3, .8)






    #define round2(x, f) (floor((x)/(f) + 0.5) * (f))


    float random(float p)
    {
        return fract(52.043*sin(p*205.429));
    }
    float random2(float p)
    {
        return random(p)*2.0-1.0;
    }

    vec3 meteor(vec2 uv, float gtime, float delay)
    {
        float seed = round2(gtime, delay);
        
        float startTime = (delay - 1.5) * random(seed);
        float time = max(0.0, min(1.0, gtime-seed - startTime));
        
        vec2 start = vec2(
            random2(seed),
            0.7 + 0.3 * random(seed+0.1)
        );
        
        vec2 end = start * 0.5;
        
        uv = uv - mix(start, end, time);
        
        end = normalize(end - start);
        uv = uv * mat2(end.x, end.y, -end.y, end.x);
        uv.x *= 0.1;
        
        float alpha = 10.0 * pow(time, 2.0) * pow(time - 1.0, 2.0);
        return vec3(max(0.0, alpha - iResolution.y * length(uv)));
    }

    vec3 meteorstorm(vec2 uv)
    {
        return
            meteor(uv, iTime/10., 9.5837/1.4) +
            meteor(uv, iTime/10. + 15.3, 15.459/1.5) +
            meteor(uv, iTime/10. + 125.0, 31.2/1.3);
    }


    float hash12(vec2 p) {
      vec3 p3  = fract(vec3(p.xyx) * MOD3);
        p3 += dot(p3, p3.yzx + 19.19);
        return fract((p3.x + p3.y) * p3.z);
    }


    vec4 moonglow(vec2 uv, float foreground, vec2 uvBasic, vec2 guv) {
        
        float c = 0.;
        
        vec4 col = vec4(c);
        col.rgb *=.2;
        vec4 mask = vec4(0.,0.,0.,0.);
      
        vec3 m = meteorstorm(guv); //
        mask.rgb+=m;
        return mask; //OK
      
        return col;
    }


    float starsMasked(vec2 uv, float t, vec2 moonUV) {
        t*=3.;
        
        float n1 = hash12(uv*10000.);
        float n2 = hash12(uv*11234.);
        float alpha1 = pow(n1, 20.);
        float alpha2 = pow(n2, 20.);
        
        float twinkle = sin((uv.x-t+cos(uv.y*20.+t))*10.);
        twinkle *= cos((uv.y*.234-t*3.24+sin(uv.x*12.3+t*.243))*7.34);
        twinkle = (twinkle + 1.)/2.;
        
        //return alpha1 * alpha2 * twinkle;
              
        
        return (alpha1 * alpha2 * twinkle);    //was m.r, but now has black also - 16.11
        
    }
 

    vec3 nmzHash33(vec3 q)
    {
        uvec3 p = uvec3(ivec3(q));
        p = p*uvec3(374761393U, 1103515245U, 668265263U) + p.zxy + p.yzx;
        p = p.yzx*(p.zxy^(p >> 3U));
        return vec3(p^(p >> 16U))*(1.0/vec3(0xffffffffU));
    }
    vec3 stars(in vec3 p)
    {
        vec3 c = vec3(0.);
        float res = iResolution.x*1.;
        vec2 R = iResolution.xy;
        for (float i=0.;i<4.;i++)
        {
            vec3 q = fract(p*(.15*res))-0.5;
            vec3 id = floor(p*(.15*res));
            vec2 rn = nmzHash33(id).xy;
            float c2 = 1.-smoothstep(0.,.6,length(q));
            float a=mod(rand(vec3(id.x,id.y, id.z)),1.);
              if(a>.9) 
                c2 *= step(rn.y,.0005+i*i*0.001)/(cos(mod(iTime,1000.)/10.*((vUv.x)-(vUv.y))))/20.;
              else
                c2 *= step(rn.y,.0005+i*i*0.001);
            c += c2*(mix(vec3(1.0,0.49,0.1),vec3(0.75,0.9,1.),rn.y)*0.3+0.9);
            p *= 1.3;
        }
        // c.x*=abs(sin((iTime/100.)/abs((vPos.x+vPos.z+vPos.y)/1800.)));
        // c.y*=abs(sin((iTime/100.)/abs((vPos.x+vPos.z+vPos.y)/1800.)));
        // c.z*=abs(sin((iTime/100.)/abs((vPos.x+vPos.z+vPos.y)/1800.)));
        
        return c*c*(0.8*vPos.y/600.);
        //abs(cos(iTime/20.*(abs(vUv.x)+abs(vUv.y)))) ;
    }


    vec3 bg(in vec3 rd)
    {
        float sd = dot(normalize(vec3(-0.5, -0.6, 0.9)), rd)*0.5+0.5;
        sd = pow(sd, 5.);
        vec3 col = mix(vec3(0.05,0.1,0.2), vec3(0.1,0.05,0.2), sd);
        return col*.63;
    }
    //-----------------------------------------------------------


    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
       
        vec2 p = vPos.zy;
        
        p.x*=iResolution.x/iResolution.y;
        
        vec3 ro = vec3(0,0,-6.7);
        vec3 rd = normalize(vec3(p,1000.));
        // vec2 mo = vec2(0.,0.) / iResolution.xy-.5;
        // mo = (mo==vec2(-.5))?mo=vec2(-0.1,0.1):mo;
        // mo.x *= iResolution.x/iResolution.y;
        // rd.yz *= mm2(mo.y);
        // rd.xz *= mm2(mo.x + sin(time*0.05)*0.2);
        
        vec3 col = vec3(0.);
        vec3 brd = rd;
        float fade = smoothstep(0.,0.01,abs(brd.y))*0.1+0.9;
        
        col = bg(rd)*fade;
        
        if (vPos.y > 0.){
            vec4 aur = smoothstep(0.,1.5,aurora(ro,rd))*fade;

             float a=mod(rand(vec3(vPos.x,vPos.z, vPos.y)),1.);
             //if(a>.99) 
                //col += stars(vPos/((abs(cos(iTime/1200.))+0.1)*1200.));
            //else
            col +=stars(vPos/900.);
            col = col*(1.-aur.a) + aur.rgb;
        }
        

        vec2 uv = vUv;
        float t = iTime*.05;
       
         
        vec2 bgUV = uv*vec2(iResolution.x/iResolution.y, 1.);
        vec2 uvBasic = uv;
        vec2 guv = (fragCoord.xy - vec2(iResolution.x*0.5, 0.0)) / iResolution.y; 
        
        
        
        
        vec4 color = vec4(0.,0.,0.,1.0);  //higher contrast, black
       
        //color += starsMasked(uv, t, bgUV);
        color += moonglow(bgUV, 1., uvBasic, guv); 
     

        
            
        fragColor = vec4(col, 1.)+color;
    }

    
     
    
    void main() {
    // vWave = vPos.z;
    // float wave = vWave * 0.25;
    // vec3 texture = texture2D(uTexture, vUv + wave);
    mainImage(gl_FragColor, vUv * iResolution.xy);
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`;
    /**
    * Test mesh
    */
    // Geometry
    const geometry = new THREE.SphereGeometry(600, 32, 32);

    // Material
    const uniforms = {
      iTime: {value: 0},
      iResolution: {value: new THREE.Vector3()},

    };
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: false,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.NoBlending,
    });

    // Mesh
    const mesh = new THREE.Mesh(geometry, material);

    // mesh.position.y=100;
    app.add(mesh);
    app.updateMatrixWorld();

    useFrame(({timestamp}) => {
      uniforms.iTime.value = timestamp * 0.01;
      uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
    });
  }

  app.setComponent('renderPriority', 'low');

  return app;
};

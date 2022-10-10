import { Injectable } from '@angular/core';

import { Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})

export class PhotoService {

  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  private platform: Platform;

  constructor(platform: Platform) {

    this.platform = platform;

  }

  public async addNewToGallery(){
    //Tomar una foto
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    /*
    this.photos.unshift({
      filepath: 'soon...',
      webviewPath: capturedPhoto.webPath
    });
    */

    //Guarda la foto y agrega esta en la colección de fotos
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);

    //Api Preference, guarda las fotos tomadas
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  //Guarda la foto en el archivo del dispositivo
  private async savePicture(photo: Photo){
    //Convertimos la foto al formato base64, requerido por la API Filesystem para guardar
    const base64Data = await this.readAsBase64(photo);

    //Escribe el archivo en el directorio de datos
    const fileName = new Date().getTime + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if(this.platform.is('hybrid')){
      //Despliega la nueva imagen reescribiendo el 'file://' path to HTTP
      return{
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    }else{
      //Usa el webPath para desplegar la nueva imagen en lugar de base64 mientras está cargada en la memoria
      return{
        filepath: fileName,
        webviewPath: photo.webPath
      };
    }
  }

  private async readAsBase64(photo: Photo){
    //"hybrid" detectará si se inicia Cordova o Capacitor
    if(this.platform.is('hybrid')){
      //Lee el archivo en el formato base64
      const file = await Filesystem.readFile({
        path: photo.path
      });

      return file.data;
    } else{
      //Trae la photo, la lee como un blob y la convierte al formato base64
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();

    return await this.convertBlobToBase64(blob) as string;
    }
  }


  //Convierte de Blob a formato base64
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  public async loadSaved() {
    //Recuperar datos de matriz de fotos en caché
    const photoList = await Preferences.get({key: this.PHOTO_STORAGE });
    this.photos = JSON.parse(photoList.value) || [];
    /*
    Manera facil para detectar cuando está corriendo en la web
    "Cuando la plataforma NO es hybrid, hacer lo siguiente:"
    */
   if(!this.platform.is('hybrid')){
    //Despliega la foto leyendola en formato base64
    for(let photo of this.photos){
      //Lee cada dato de las fotos guardadas from the Filesystem
      const readFile = await Filesystem.readFile({
        path: photo.filepath,
        directory: Directory.Data,
      });
      //Solo palataforma web:Carga el dato de la foto como base64
      photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
     }
    }
  }
}


export interface UserPhoto {
  filepath: string;
  webviewPath: string;
}


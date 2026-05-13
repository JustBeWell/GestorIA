import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-branding-video-page',
  standalone: true,
  template: `
    <div class="branding-wrap" [class.fading]="fading">
      <video
        #vid
        src="/hero.mp4"
        autoplay
        playsinline
        preload="auto"
        (ended)="onEnded()"
        (error)="goLogin()"
        (canplay)="onCanPlay()"
      ></video>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .branding-wrap {
      position: fixed;
      inset: 0;
      background: #0c1a16;
      z-index: 9999;
      opacity: 1;
      transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
      animation: introFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    @keyframes introFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .branding-wrap.fading {
      opacity: 0;
      pointer-events: none;
    }

    video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }
  `],
})
export class BrandingVideoPageComponent implements OnInit {
  @ViewChild('vid', { static: true }) private vid!: ElementRef<HTMLVideoElement>;
  private readonly router = inject(Router);
  private fallbackTimer?: ReturnType<typeof setTimeout>;

  protected fading = false;

  ngOnInit(): void {
    const video = this.vid.nativeElement;
    video.volume = 0.25;
    this.fallbackTimer = setTimeout(() => this.triggerFade(), 20_000);
  }

  protected onCanPlay(): void {
    this.vid.nativeElement.volume = 0.25;
  }

  protected onEnded(): void {
    clearTimeout(this.fallbackTimer);
    this.triggerFade();
  }

  private triggerFade(): void {
    if (this.fading) return;
    this.fading = true;
    setTimeout(() => this.goLogin(), 1250);
  }

  protected goLogin(): void {
    void this.router.navigate(['/auth'], { replaceUrl: true });
  }
}

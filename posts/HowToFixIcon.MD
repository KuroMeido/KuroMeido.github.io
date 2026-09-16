# Why Your Icons8 Icons Get Cropped in Revit (and How to Fix It for Good)

If you build Revit add-ins and pull your ribbon icons from [icons8.com](https://icons8.com), you've probably run into this: the icon looks perfect in Windows Explorer, but the moment it lands on a Revit ribbon button, it's zoomed in and clipped at the edges. This post walks through why that happens and shows a small, reusable `ImageHelper` class that fixes it permanently.

## The symptom

A 32×32 PNG downloaded straight from Icons8 renders like it's been cropped — the edges of the icon are cut off, as if the image were larger than its container and got clipped by the frame.

![Ribbon panel showing a cropped icon](INSERT_IMAGE_1_HERE.png)
*Figure 1: A ribbon button icon rendered cropped/zoomed in Revit before the fix.*

## The real cause: DPI metadata, not pixel size

The instinctive assumption is "the file must be the wrong pixel dimensions." It isn't. The real culprit is the **DPI value baked into the PNG's metadata**.

Icons8 (like many web icon generators) exports PNGs at **72 DPI**, while WPF — the UI framework Revit's ribbon is built on — assumes **96 DPI is one device pixel**. WPF doesn't just look at `PixelWidth`/`PixelHeight` when deciding how big to draw an image; it computes the *displayed* size like this:

![File properties showing 72 DPI metadata on an icon downloaded from Icons8](INSERT_IMAGE_2_HERE.png)
*Figure 2: Windows file properties (Details tab) showing the 72 DPI resolution baked into an icon downloaded from Icons8.*

```
Displayed size (device-independent units) = PixelWidth / (DpiX / 96)
```

So a 32-pixel-wide icon saved at 72 DPI doesn't display at 32 units — it displays at roughly **42.7 units**. Revit's ribbon button is a fixed-size container (16×16 or 32×32), so the extra ~10 units simply get clipped by the frame. That's the "cropped/zoomed" look.

### The fix that *doesn't* fully work

A common first attempt is to force the decode size:

```csharp
image.DecodePixelWidth = 32;
image.DecodePixelHeight = 32;
```

This changes how many pixels get *decoded*, but it does **not** rewrite the DPI metadata WPF uses for layout. The image can still report 72 DPI internally, so WPF still inflates the displayed size — and the crop persists.

## The fix that actually works: re-bake the image at 96 DPI

The reliable solution is to draw the bitmap onto a new canvas that is explicitly created at 96 DPI, regardless of what the source file claims. In WPF this means rendering through a `DrawingVisual` into a `RenderTargetBitmap`:

```csharp
private static BitmapSource NormalizeTo96Dpi(BitmapSource source)
{
    int width = source.PixelWidth;
    int height = source.PixelHeight;

    var dv = new DrawingVisual();
    using (DrawingContext dc = dv.RenderOpen())
    {
        dc.DrawImage(source, new Rect(0, 0, width, height));
    }

    var rtb = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
    rtb.Render(dv);
    rtb.Freeze();
    return rtb;
}
```

This keeps the icon's original pixel dimensions (so a 16×16 stays 16×16, a 32×32 stays 32×32) but hard-codes the DPI metadata of the *output* to 96 — which is what WPF's layout math expects. Once that's true, `PixelWidth / (96/96)` always equals the actual pixel size, and Revit's ribbon stops clipping the image.

## Only normalize when it's actually needed

Re-rendering every icon on every load is wasted work if the source is already correct. A quick check before normalizing avoids that:

```csharp
private static bool NeedsNormalize(BitmapFrame frame)
{
    bool dpiOk = Math.Abs(frame.DpiX - 96) < 0.1 && Math.Abs(frame.DpiY - 96) < 0.1;
    return !dpiOk;
}
```

The 0.1 tolerance matters — DPI values read back from PNG metadata are often not exactly `72.0` or `96.0` due to rounding during encoding.

## Putting it together: a drop-in `ImageHelper`

Here's the complete helper, designed for loading icons from embedded resources in a Revit add-in (via `PushButtonData.Image` / `LargeImage`):

```csharp
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace YourAddin
{
    public static class ImageHelper
    {
        private static readonly Assembly _assembly = Assembly.GetExecutingAssembly();

        /// <summary>
        /// Loads an icon from an embedded resource by file name.
        /// Example: LoadFromResx("rotate3d.png")
        /// </summary>
        public static BitmapImage LoadFromResx(string imageName)
        {
            try
            {
                string resourceName = _assembly.GetManifestResourceNames()
                    .FirstOrDefault(r => r.EndsWith(imageName, StringComparison.OrdinalIgnoreCase));

                if (resourceName != null)
                {
                    using (Stream stream = _assembly.GetManifestResourceStream(resourceName))
                    {
                        if (stream != null)
                        {
                            return LoadFromStream(stream);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ImageHelper] LoadFromResx failed: {ex.Message}");
            }

            return GetFallback();
        }

        private static BitmapImage LoadFromStream(Stream stream)
        {
            using (MemoryStream ms = new MemoryStream())
            {
                stream.CopyTo(ms);
                ms.Position = 0;

                BitmapFrame frame = BitmapFrame.Create(ms, BitmapCreateOptions.None, BitmapCacheOption.OnLoad);

                BitmapImage image = new BitmapImage();

                if (NeedsNormalize(frame))
                {
                    BitmapSource normalized = NormalizeTo96Dpi(frame);

                    using (MemoryStream outMs = new MemoryStream())
                    {
                        PngBitmapEncoder encoder = new PngBitmapEncoder();
                        encoder.Frames.Add(BitmapFrame.Create(normalized));
                        encoder.Save(outMs);
                        outMs.Position = 0;

                        image.BeginInit();
                        image.StreamSource = outMs;
                        image.CacheOption = BitmapCacheOption.OnLoad;
                        image.EndInit();
                    }
                }
                else
                {
                    ms.Position = 0;
                    image.BeginInit();
                    image.StreamSource = ms;
                    image.CacheOption = BitmapCacheOption.OnLoad;
                    image.EndInit();
                }

                image.Freeze();
                return image;
            }
        }

        private static bool NeedsNormalize(BitmapFrame frame)
        {
            bool dpiOk = Math.Abs(frame.DpiX - 96) < 0.1 && Math.Abs(frame.DpiY - 96) < 0.1;
            return !dpiOk;
        }

        private static BitmapImage GetFallback()
        {
            try
            {
                string resourceName = _assembly.GetManifestResourceNames()
                    .FirstOrDefault(r => r.EndsWith("dot.png", StringComparison.OrdinalIgnoreCase));

                if (resourceName != null)
                {
                    using (Stream stream = _assembly.GetManifestResourceStream(resourceName))
                    {
                        return LoadFromStream(stream);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ImageHelper] GetFallback failed: {ex.Message}");
            }

            return new BitmapImage();
        }

        private static BitmapSource NormalizeTo96Dpi(BitmapSource source)
        {
            int width = source.PixelWidth;
            int height = source.PixelHeight;

            var dv = new DrawingVisual();
            using (DrawingContext dc = dv.RenderOpen())
            {
                dc.DrawImage(source, new Rect(0, 0, width, height));
            }

            var rtb = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
            rtb.Render(dv);
            rtb.Freeze();
            return rtb;
        }
    }
}
```

Usage stays simple — no size parameter needed, since the helper reads each icon's own pixel dimensions and only touches the DPI:

```csharp
pushButtonData.Image = ImageHelper.LoadFromResx("rotate3d-16.png");
pushButtonData.LargeImage = ImageHelper.LoadFromResx("rotate3d-32.png");
```

![Ribbon panel showing the icon rendered correctly after the fix](INSERT_IMAGE_3_HERE.png)
*Figure 3: The same ribbon button after normalizing the icon to 96 DPI — no more cropping.*

## Key takeaways

- **Cropped ribbon icons in Revit are almost always a DPI metadata problem, not a pixel-size problem.** Icons8 exports at 72 DPI; WPF assumes 96.
- **`DecodePixelWidth`/`DecodePixelHeight` alone won't fix it** — they change decode resolution but not the DPI metadata WPF uses for layout sizing.
- **Re-rendering through `RenderTargetBitmap` at 96 DPI** is the dependable fix, since it bakes the correct DPI into the output regardless of the source's original metadata.
- **Check before you normalize** — comparing the source DPI to 96 with a small tolerance avoids unnecessary re-encoding for icons that are already correct.
- If an icon is *still* cropped after this fix, the next suspect is transparent padding baked into the source canvas (the real artwork sitting smaller than the file's edges) rather than DPI — that requires trimming the alpha bounding box before normalizing.

If you're hitting this in your own Revit add-in, the `ImageHelper` above is safe to drop in as-is — just make sure your icon PNGs are embedded resources and swap in your own fallback icon name.